const { Kafka } = require("kafkajs");
const mongoose = require("mongoose");
const ApiAnalytics = require("../../schemas/analytics"); // MongoDB Model
const redis = require('../../config/redis')
require('dotenv').config({ path: '../../.env' });
const connectDb=require('../../config/db')
const MONGO_URI = process.env.MONGO_URI;
console.log(MONGO_URI)
connectDb(MONGO_URI);

// Initialize Kafka consumer
const kafka = new Kafka({ clientId: "redis-updater", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "analytics-group" });

// Helper function to generate the current hour key
const getCurrentHourKey = () => {
  const now = new Date();
  return now.toISOString().slice(0, 13).replace(/[-T:]/g, ""); // Format: YYYYMMDDHH
};

// 🔹 **Fetch from DB if not found in Redis**
const fetchFromDBAndCache = async (apiId) => {
  try {
    const apiData = await ApiAnalytics.findOne({ apiId });

    if (apiData) {
      await redis.hset(`api:stats:${apiId}`, 
        "totalCalls", apiData.totalCalls,
        "successCount", apiData.successCount,
        "failureCount", apiData.failureCount,
        "avgResponseTime", apiData.avgResponseTime,
        "maxResponseTime", apiData.maxResponseTime,
        "minResponseTime", apiData.minResponseTime,
        "cacheHits", apiData.cacheHits,
        "mostRecentError", apiData.mostRecentError
      );

      for (const [errorType, count] of Object.entries(apiData.errorTypes)) {
        await redis.hset(`api:errorTypes:${apiId}`, errorType, count);
      }

      for (const [range, count] of Object.entries(apiData.responseTimeDistribution)) {
        await redis.hset(`api:responseTimeDist:${apiId}`, range, count);
      }

      for (const [apiKey, count] of Object.entries(apiData.apiKeysUsed)) {
        await redis.hset(`api:apiKeysUsed:${apiId}`, apiKey, count);
      }
    }

    return apiData;
  } catch (err) {
    console.error("DB Fetch Error:", err);
    return null;
  }
};

// 🔹 **Set expiry only if the key is new**
const setExpiryIfNew = async (key, expiryTime) => {
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.expire(key, expiryTime);
  }
};

// 🔹 **Main Kafka Consumer Logic**
const run = async () => {
  try {
    // Connect to Kafka
    await consumer.connect();
    await consumer.subscribe({ topic: "api-logs", fromBeginning: false });

    // Process each message
    await consumer.run({
      eachMessage: async ({ message }) => {
        const logData = JSON.parse(message.value.toString());
        const { apiId, clientId, statusCode, responseTime, isCacheHit, userId, apiKey, errorType } = logData;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const hourKey = getCurrentHourKey();

        // Fetch API stats from Redis or DB
        let apiStats = await redis.hgetall(`api:stats:${apiId}`);
        if (!apiStats || Object.keys(apiStats).length === 0) {
          console.log(`🔍 Cache Miss for API: ${apiId}, Fetching from DB...`);
          apiStats = await fetchFromDBAndCache(apiId);
        }

        // Update Redis Analytics (Total)
        await redis.incr(`api:count:${apiId}`);
        await redis.incr(`client:count:${clientId}`);
        await redis.incrbyfloat(`api:avg_response:${apiId}`, responseTime);

        if (isSuccess) {
          await redis.incr(`api:success:${apiId}`);
        } else {
          await redis.incr(`api:failure:${apiId}`);
          await redis.hincrby(`api:errorTypes:${apiId}`, errorType, 1);
          await redis.hset(`api:stats:${apiId}`, "mostRecentError", errorType);
        }

        if (isCacheHit) {
          await redis.incr(`api:cacheHits:${apiId}`);
        }

        await redis.sadd(`api:uniqueUsers:${apiId}`, userId);
        await redis.hincrby(`api:apiKeysUsed:${apiId}`, apiKey, 1);

        // Update max/min response time
        const currentMax = await redis.get(`api:max_response:${apiId}`);
        const currentMin = await redis.get(`api:min_response:${apiId}`);
        if (!currentMax || responseTime > Number(currentMax)) {
          await redis.set(`api:max_response:${apiId}`, responseTime);
        }
        if (!currentMin || responseTime < Number(currentMin)) {
          await redis.set(`api:min_response:${apiId}`, responseTime);
        }

        // Response Time Distribution
        const responseRange = `${Math.floor(responseTime / 100) * 100}-${Math.floor(responseTime / 100) * 100 + 99}`;
        await redis.hincrby(`api:responseTimeDist:${apiId}`, responseRange, 1);

        // 🔹 **Hourly Stats**
        await redis.incr(`hourly:api:count:${apiId}:${hourKey}`);
        await redis.incr(`hourly:client:count:${clientId}:${hourKey}`);
        await redis.incrbyfloat(`hourly:api:avg_response:${apiId}:${hourKey}`, responseTime);

        if (isSuccess) {
          await redis.incr(`hourly:api:success:${apiId}:${hourKey}`);
        } else {
          await redis.incr(`hourly:api:failure:${apiId}:${hourKey}`);
          await redis.hincrby(`hourly:api:errorTypes:${apiId}:${hourKey}`, errorType, 1);
          await redis.hset(`hourly:api:stats:${apiId}:${hourKey}`, "mostRecentError", errorType);
        }

        if (isCacheHit) {
          await redis.incr(`hourly:api:cacheHits:${apiId}:${hourKey}`);
        }

        await redis.sadd(`hourly:api:uniqueUsers:${apiId}:${hourKey}`, userId);
        await redis.hincrby(`hourly:api:apiKeysUsed:${apiId}:${hourKey}`, apiKey, 1);

        // Set expiry **only if the key is new**
        const expiryTime = 3600; // 1 hour
        await setExpiryIfNew(`hourly:api:count:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:client:count:${clientId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:avg_response:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:success:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:failure:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:cacheHits:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:uniqueUsers:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:errorTypes:${apiId}:${hourKey}`, expiryTime);
        await setExpiryIfNew(`hourly:api:apiKeysUsed:${apiId}:${hourKey}`, expiryTime);

        console.log(`📊 Redis Updated for API: ${apiId} (Hour: ${hourKey})`);
      },
    });
  } catch (err) {
    console.error("Kafka Consumer Error:", err);
  }
};

// Start the consumer
run().catch(console.error);
