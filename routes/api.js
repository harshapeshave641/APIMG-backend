const express = require('express');
const router = express.Router();
const Api =require('../schemas/api')
const Client=require('../schemas/client')
const ApiKey=require('../schemas/apiKey')
const authMiddleware = require('../middleware/authMiddleware'); 

// 1. Create a new API
router.post('/', authMiddleware, async (req, res) => {
    try {
        
        const { name, baseUrl, method,endpoint,apiKey } = req.body;
        const clientId=req.user.clientId
        console.log("Hell na",clientId)
        if (!clientId || !name || !baseUrl||!method) {
            return res.status(400).json({ message: 'Client ID, name, and base URL are required' });
        }

        const client=await Client.findById(clientId);
        if(!client){
            return res.status(400).json({ message: 'Client not found' });
        }
        const newApi = new Api({
            clientId,
            name,
            baseUrl,
            endpoint,
            method,
            apiKey
        });

        await newApi.save();
        res.status(200).json({ message: 'API created successfully', data: newApi });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 2. Fetch all APIs
// router.get('/', authMiddleware, async (req, res) => {
//     try {
//         const apis = await Api.find(); // Populate client details if needed
//         res.status(200).json({ message: 'APIs fetched successfully', data: apis });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });

router.get('/', authMiddleware, async (req, res) => {
    try {
        const clientId=req.user.clientId||req.body._id;
        console.log(clientId)
        const apis = await Api.find({clientId:clientId}); // Populate client details if needed
        res.status(200).json({ message: 'APIs fetched successfully', data: apis });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/all', authMiddleware, async (req, res) => {
    try {
        const apis = await Api.find(); // Populate client details if needed
        res.status(200).json({ message: 'APIs fetched successfully', data: apis });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/:clientId', authMiddleware, async (req, res) => {
    try {
        const clientId=req.params.clientId;
        console.log(clientId)
        const apis = await Api.find({clientId:clientId}); 
        res.status(200).json({ message: 'APIs fetched successfully', data: apis });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 3. Fetch a single API by ID
router.get('/:apiId', authMiddleware, async (req, res) => {
    try {
        const apiId = req.params.apiId;
        const api = await Api.findById(apiId); // Populate client details if needed

        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        res.status(200).json({ message: 'API fetched successfully', data: api });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 4. Update an API
router.put('/:apiId', authMiddleware, async (req, res) => {
    try {
        const apiId = req.params.apiId;
        const { name, baseUrl, method, isActive } = req.body;

        const api = await Api.findById(apiId);
        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        if (name) api.name = name;
        if (baseUrl) api.baseUrl = baseUrl;
        
        if (isActive !== undefined) api.isActive = isActive;

        api.updatedAt = Date.now();
        await api.save();

        res.status(200).json({ message: 'API updated successfully', data: api });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 5. Delete an API
router.delete('/:apiId', authMiddleware, async (req, res) => {
    try {
        const apiId = req.params.apiId;
        const api = await Api.findByIdAndDelete(apiId);

        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }
        await ApiKey.deleteMany({apiId:apiId})
        res.status(200).json({ message: 'API deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 6. Enable/Disable an API
router.put('/:apiId/toggle-active', authMiddleware, async (req, res) => {
    try {
        const apiId = req.params.apiId;
        const api = await Api.findById(apiId);

        if (!api) {
            return res.status(404).json({ message: 'API not found' });
        }

        api.isActive = !api.isActive; // Toggle the isActive field
        api.updatedAt = Date.now();
        await api.save();

        res.status(200).json({ message: `API ${api.isActive ? 'enabled' : 'disabled'} successfully`, data: api });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 7. Add a method to an API


module.exports=router



