const redis = require('../config/redis')
const ApiKey = require('../schemas/apiKey');




async function rateLimitMiddleware(req, res, next) {
    try {
        const apiKey = req.headers['authorization']?.split(' ')[1]; 

        if (!apiKey) {
            return res.status(401).json({ error: "Authorization API Key is required" });
        }

        // Redis keys
        const cacheKey = `apiKey:${apiKey}`;
        const invalidCacheKey = `invalidApiKey:${apiKey}`;

        // Check if the API key is invalid (cached)
        const isInvalid = await redis.get(invalidCacheKey);
        if (isInvalid) {
            return res.status(403).json({ error: "Invalid or inactive API Key (cached)" });
        }

        // Check Redis cache for API key data
        let apiKeyData = await redis.get(cacheKey);
        if (apiKeyData) {
            apiKeyData = JSON.parse(apiKeyData);
        } else {
            // Fetch API key details from DB
            apiKeyData = await ApiKey.findOne({ key: apiKey });
            if (!apiKeyData || !apiKeyData.isActive) {
                // Cache invalid API keys for 5 minutes to avoid frequent DB hits
                await redis.set(invalidCacheKey, "true", "EX", 300);
                return res.status(403).json({ error: "Invalid or inactive API Key (cached)" });
            }

            // Cache valid API key data in Redis for 1 hour
            await redis.set(cacheKey, JSON.stringify(apiKeyData), "EX", 3600);
        }

        // Set API key details in req object
        req.apiKey = apiKey;
        req.clientId = apiKeyData.clientId;
        req.apiId = apiKeyData.apiId;

        if(!req.apiKey||!req.clientId||!req.apiId){
            return res.status(400).json({ error: "Missing API Key, Client ID, or API ID" });
        }

        const keyUsageLimit = apiKeyData.usageLimit;
        const hourlyLimit = apiKeyData.usageLimitPerHour;

        // Redis keys for total and hourly usage tracking
        const totalUsageKey = `api:${apiKey}:total`;
        const hourlyUsageKey = `api:${apiKey}:hourly:${new Date().getHours()}`;

        // Get current usage counts
        let totalUsage = await redis.get(totalUsageKey);
        let hourlyUsage = await redis.get(hourlyUsageKey);

        totalUsage = totalUsage ? parseInt(totalUsage) : 0;
        hourlyUsage = hourlyUsage ? parseInt(hourlyUsage) : 0;

        // Check if rate limits are exceeded
        if (totalUsage >= keyUsageLimit) {
            req.error = "API Key usage limit exceeded";
            return next();
        }
        if (hourlyUsage >= hourlyLimit) {
            req.error = "Hourly API usage limit exceeded";
            return next();
        }

        // Increment usage
        await redis.incr(totalUsageKey);
        const newHourlyCount = await redis.incr(hourlyUsageKey);
        if (newHourlyCount === 1) {
            await redis.expire(hourlyUsageKey, 3600);
        }

        // Sync total usage with the database
        await ApiKey.updateOne(
            { key: apiKey },
            { $inc: { usageTotalCount: 1 } } // Increment usageTotalCount by 1
        );

        next();
    } catch (err) {
        console.error("Rate Limit Error:", err);
        req.error = "Internal Server Error";
        next();
    }
}

module.exports=rateLimitMiddleware