const express = require('express');
const connectDb = require('./config/db');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const rateLimitMiddleware = require('./middleware/rate_limit');
const { cacheMiddleware, redis } = require('./middleware/redis_cache'); // Use redis from here
const { initProducer, sendToKafka } = require("./kafka/producers/requestProducer");

dotenv.config();

// Load Schemas
require('./schemas/analytics');
require('./schemas/api');
require('./schemas/apiKey');
require('./schemas/client');
require('./schemas/user');

// Routes
const apiRoutes = require('./routes/api');
const apiKeyRoutes = require('./routes/apiKey');
const clientRoutes = require('./routes/client');
const userRoutes = require('./routes/user');
const userKeyRoutes = require('./routes/userKey');
const analyticsRoutes=require('./routes/analytics')
const app = express();

app.use(express.json());
app.use(cors());

// Route Definitions
app.use('/User', userRoutes);
app.use('/Client', clientRoutes);
app.use('/Api', apiRoutes);
app.use('/ApiKey', apiKeyRoutes);
app.use('/UserKey', userKeyRoutes);
app.use('/Analytics',analyticsRoutes)

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

connectDb(MONGO_URI);
initProducer(); // Call once at startup

app.get('/', (req, res) => {
    res.send({ message: 'Welcome To APIMG!' });
});

app.get('/eval', rateLimitMiddleware, cacheMiddleware, async (req, res) => {
    try {
        const { base_url, endpoint, method } = req.body;
        const apiId = req.apiId;
        const apiKey = req.apiKey;
        const clientId = req.clientId;

        // Middleware error handling
        if (req.error) {
            console.error(`🚨 Middleware Error: ${req.error}`);
            await sendToKafka("api-logs", {
                apiId: apiId || "unknown",
                clientId,
                statusCode: 400,
                responseTime: 0,
                apiKey,
                error: req.error,
                cacheHit: req.isCacheHit,
                isSuccess:false
            });
            return res.status(400).json({ error: req.error });
        }

        // Check cache first
        if (req.isCacheHit) {
            console.log("✅ Serving cached response...");
            const cachedResponse = JSON.parse(await redis.get(req.cacheKey)); // Use redis
            await sendToKafka("api-logs", {
                apiId,
                clientId,
                statusCode: 200,
                responseTime: 0,
                apiKey,
                error: null,
                cacheHit: true,
                isSuccess:true
            });

            return res.json(cachedResponse);
        }

        // API Request
        const url = `${base_url}${endpoint}`;
        const startTime = Date.now();

        try {
            const response = await axios({ method, url, headers: { Authorization: apiKey } });
            const responseTime = Date.now() - startTime;

            // Store successful response in Redis
            await redis.set(req.cacheKey, JSON.stringify(response.data), "EX", 300); // Use redis

            // Log success
            await sendToKafka("api-logs", {
                apiId,
                clientId,
                statusCode: response.status,
                responseTime,
                apiKey,
                error: null,
                cacheHit: false,
                isSuccess:true
            });

            return res.json(response.data);
        } catch (apiError) {
            console.error("❌ API Request Failed:", apiError.message);
            const responseTime = Date.now() - startTime;

            // Log failure
            await sendToKafka("api-logs", {
                apiId,
                clientId,
                statusCode: apiError.response?.status || 500,
                responseTime,
                apiKey,
                error: apiError.message,
                cacheHit: false,
                isSuccess:false
            });

            return res.status(500).json({ error: "Failed to fetch data", details: apiError.message });
        }
    } catch (serverError) {
        console.error("🚨 Internal Server Error:", serverError.message);

        await sendToKafka("api-logs", {
            apiId: req.apiId,
            clientId: req.clientId,
            statusCode: 500,
            responseTime: 0,
            apiKey: req.headers['authorization'] || "unknown",
            error: serverError.message,
            cacheHit: req.isCacheHit || false,
            isSuccess:false
        });

        return res.status(500).json({ error: "Internal Server Error", details: serverError.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
});
