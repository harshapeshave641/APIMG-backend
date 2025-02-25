
const redis = require('../config/redis')

// Redis Middleware for Caching
async function cacheMiddleware(req, res, next) {
    try {
        if(req.error){return next()}
        const { base_url, endpoint, method } = req.body;
        if (!base_url || !endpoint || !method) {
            req.isCacheHit = false; 
            return next(); 
        }

        const cacheKey = `${method}:${base_url}${endpoint}`;
        req.cacheKey = cacheKey; // Store cache key in req
        req.isCacheHit = false; // Default to false

        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            req.isCacheHit = true;
            console.log("✅ Cache hit!");           
        }
        else {
            console.log("❌ Cache miss. Fetching from API...");
        }
        next();
    } catch (err) {
        console.error("🚨 Redis Error:", err);
        req.isCacheHit = false; // Ensure it's always set
        next(); // Continue request execution
    }
}

module.exports = {cacheMiddleware,redis};
