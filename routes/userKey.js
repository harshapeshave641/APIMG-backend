const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
const UserKeys = require('../schemas/userKey');
const ApiKey = require('../schemas/apiKey'); // Import the ApiKey schema

// POST: Create or add an API key for a user
router.post('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const apiKeyId = req.body.apikeyId;

        if (!userId || !apiKeyId) {
            return res.status(400).json({ message: "No user ID or API key ID found" });
        }

        let userKey = await UserKeys.findOne({ userId });

        if (!userKey) {
            userKey = new UserKeys({ userId, keys: [apiKeyId] });
        } else {
            if (!Array.isArray(userKey.keys)) {
                userKey.keys = [];
            }
            userKey.keys.push(apiKeyId);
        }

        await userKey.save();

        return res.status(201).json({ message: "Key successfully created" });

    } catch (error) {
        console.error("Error in /apiKeys:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// GET: Retrieve API keys based on userId
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: "No user ID found" });
        }

        // Populate 'keys' array with API key details
        const userKey = await UserKeys.findOne({ userId }).populate({
            path: 'keys',
            model: 'ApiKey', // Ensure this matches your ApiKey schema name
        });

        if (!userKey || userKey.keys.length === 0) {
            return res.status(404).json({ message: "No keys found for this user" });
        }

        return res.status(200).json({ keys: userKey.keys });

    } catch (error) {
        console.error("Error retrieving keys:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
