const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "api-request-logger",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"], // Dynamic broker list
    retry: {
        initialRetryTime: 300,
        retries: 10,  // Increase retries
    },
});

const producer = kafka.producer();

const initProducer = async () => {
    try {
        await producer.connect();
        console.log("✅ Kafka Producer Connected");
    } catch (error) {
        console.error("❌ Kafka Connection Failed:", error);
    }
};

const sendToKafka = async (topic, message) => {
    try {
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });
    } catch (error) {
        console.error("❌ Error sending message to Kafka:", error);
    }
};

process.on("SIGINT", async () => {
    console.log("🔌 Closing Kafka Producer...");
    await producer.disconnect();
    process.exit(0);
});

module.exports = { sendToKafka, initProducer };
