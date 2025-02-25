const { Kafka } = require("kafkajs");
const mongoose = require("mongoose");
const ApiAnalytics = require("../../schemas/analytics");

const kafka = new Kafka({ clientId: "db-updater", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "logger-group" });
const connectDb=require('../../config/db')
require('dotenv').config({ path: '../../.env' });

const MONGO_URI = process.env.MONGO_URI;

connectDb(MONGO_URI);
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "api-logs", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const logData = JSON.parse(message.value.toString());
      const { apiId, clientId, statusCode, responseTime, apiKey, error } = logData;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const errorType = error || "None";

      try {
        const analytics = await ApiAnalytics.findOneAndUpdate(
          { apiId, clientId },
          {
            $inc: {
              totalCalls: 1,
              cacheHits: logData.cacheHit ? 1 : 0,
              successCount: isSuccess ? 1 : 0,
              failureCount: isSuccess ? 0 : 1,
              [`apiKeysUsed.${apiKey}`]: 1,
              [`errorTypes.${errorType}`]: isSuccess ? 0 : 1,
              [`responseTimeDistribution.${Math.floor(responseTime / 100) * 100}`]: 1,
            },
            $set: { mostRecentError: isSuccess ? "" : errorType },
            $min: { minResponseTime: responseTime },
            $max: { maxResponseTime: responseTime },
          },
          { upsert: true, new: true }
        );

        // Update average response time
        analytics.avgResponseTime =
          ((analytics.avgResponseTime * (analytics.totalCalls - 1)) + responseTime) / analytics.totalCalls;
        await analytics.save();

        console.log(`📊 Analytics updated for API: ${apiId}`);
      } catch (err) {
        console.error("❌ Error updating analytics:", err);
      }
    },
  });
};

run().catch(console.error);
