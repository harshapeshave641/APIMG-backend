const { Kafka } = require("kafkajs");
const nodemailer = require("nodemailer");
const redis = require("../../config/redis");
require("dotenv").config({ path: "../../.env" });

const kafka = new Kafka({ clientId: "anomaly-detector", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "anomaly-group" });

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

// Email Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "api-logs", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const logData = JSON.parse(message.value.toString());
        const { apiId, clientId, statusCode } = logData;

        if (statusCode >= 400) {
          const redisKey = `api:failure:${apiId}`;
          const failureCount = await redis.incr(redisKey);

          if (failureCount === 1) {
            await redis.expire(redisKey, 300); // Expire in 5 minutes
          }

          console.log(`🚨 API ${apiId} Failure Count: ${failureCount}`);

          if (failureCount >= 10) {
            const mailOptions = {
              from: EMAIL_USER,
              to: "peshaveharsha12@example.com",
              subject: `🚨 High API Failure Rate for ${apiId}`,
              text: `API ${apiId} has failed more than 10 times within a short period. Immediate action is required.`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error("❌ Email send error:", error);
              } else {
                console.log(`📧 Alert sent to client for API: ${apiId}`);
              }
            });

            await redis.del(redisKey); // Reset failure count after alerting
          }
        }
      } catch (err) {
        console.error("❌ Error processing Kafka message:", err);
      }
    },
  });
};

run().catch(console.error);
