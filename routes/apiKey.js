const express = require('express');
const router = express.Router();
const ApiKey = require('../schemas/apiKey'); // Assuming your model is located here
const Api = require('../schemas/api'); // Assuming your Api model is located here
const authMiddleware = require('../middleware/authMiddleware'); // Assuming an authentication middleware

router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log("in da game")
    const { apiId, usageLimitPerHour, expiresAt,usageLimit } = req.body;
    const clientId=req.user.clientId||req.body.clientId
    const api = await Api.findById(apiId);
    if (!api) {
      return res.status(404).json({ message: 'API not found' });
    }

    const key = Math.random().toString(36).substring(2, 15); 

    const newApiKey = new ApiKey({
      apiId,
      clientId,
      key,
      usageLimit: usageLimit || 10,
      usageLimitPerHour,
      expiresAt,
    });

    await newApiKey.save();
    res.status(201).json({ message: 'API Key created successfully', data: newApiKey });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
});

// Fetch all API Keys for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clientId=req.user.clientId
    const apiKeys = await ApiKey.find({clientId:clientId});
    // console.log(apiKeys)
    res.status(200).json({ message: 'Fetched API keys successfully', data: apiKeys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/key', async (req, res) => {
  try {
    console.log("hello");
    const { key } = req.query; // Get key from query parameters
    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    const apiKey = await ApiKey.findOne({ key: key }); // Use findOne for a single key
    console.log(apiKey);

    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    res.status(200).json({ message: 'API key fetched successfully', data: apiKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get('/:id', async (req, res) => {
  try {
    console.log("hello")
    const apiKeys = await ApiKey.find({apiId:req.params.id});
    console.log(apiKeys)
    if (!apiKeys) {
      return res.status(404).json({ message: 'API key not found' });
    }
    res.status(200).json({ message: 'API keys fetched successfully', data: apiKeys });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an API key by ID
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { usageLimit, usageLimitPerHour, expiresAt } = req.body;
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    if (usageLimit !== undefined) apiKey.usageLimit = usageLimit;
    if (expiresAt) apiKey.expiresAt = expiresAt;
    if(usageLimitPerHour)apiKey.usageLimitPerHour=usageLimitPerHour;
    await apiKey.save();
    res.status(200).json({ message: 'API key updated successfully', data: apiKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an API key by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const apiKey = await ApiKey.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'API key deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check API key usage and status
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }

    const remainingUsage = apiKey.usageLimit - apiKey.usageCount;
    const status = {
      remainingUsage,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
    };

    res.status(200).json({ message: 'API key status fetched successfully', data: status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



  

module.exports = router;
