const express = require('express');
const router = express.Router();
const Client = require('../schemas/client');
const API=require('../schemas/api')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validateMongoUri = require('../util/mongoValidate');
const authMiddleware=require('../middleware/authMiddleware');
const Api = require('../schemas/api');
const JWT_SECRET = process.env.JWT_SECRET;

// Fetch all clients
router.get('/',authMiddleware, async (req, res) => {
    try {
        console.log("hello")
        const clients = await Client.find();
        console.log(clients)
        res.status(200).json({ message: 'Fetched successfully', data: clients });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Register a new client
router.post('/register', async (req, res) => {
    try {
        console.log("hello")
        const { email, password,companyName, isActive } = req.body;

        const existingClient = await Client.findOne({ email });
        if (existingClient) {
            return res.status(400).json({ message: 'Email already exists!' });
        }


        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newClient = new Client({
            email,
            password: hashedPassword,
            companyName,
            isActive: isActive !== undefined ? isActive : true,
        });
        await newClient.save();
        const payload = { clientId: newClient._id, email: newClient.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Client created successfully', data: newClient ,token:token});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login a client
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingClient = await Client.findOne({ email });
        if (!existingClient) {
            return res.status(400).json({ message: 'Client does not exist' });
        }

        const isMatch = await bcrypt.compare(password, existingClient.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        const payload = { clientId: existingClient._id, email: existingClient.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fetch a single client by ID
router.get('/',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId||req.body.clientId;
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client fetched successfully', data: client });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update a client by ID
router.put('/',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId;
        const { email, password, companyName, atlasUri, isActive } = req.body;

        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        if (email) client.email = email;
        if (password) {
            const saltRounds = 10;
            client.password = await bcrypt.hash(password, saltRounds);
        }
        if (companyName) client.companyName = companyName;
        if (atlasUri) {
            const isValidUri = await validateMongoUri(atlasUri);
            if (!isValidUri) {
                return res.status(400).json({ message: 'Invalid MongoDB Atlas URI' });
            }
            client.atlasUri = atlasUri;
        }
        if (isActive !== undefined) client.isActive = isActive;

        await client.save();
        res.status(200).json({ message: 'Client updated successfully', data: client });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a client by ID
router.delete('/',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId;
        const client = await Client.findByIdAndDelete(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Add an API to a client
router.post('/apis',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId;
        const { apiId } = req.body;

        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        const Ap= await Api.findById(apiId)
        if(!Ap){
            res.status(400).json({message:"Invalid Api"})
        }
        client.apis.push(apiId);
        await client.save();
        res.status(200).json({ message: 'API added successfully', data: client });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Remove an API from a client
router.delete('/apis/:apiId',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId;
        const apiId = req.params.apiId;

        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        client.apis = client.apis.filter(id => id.toString() !== apiId);
        await client.save();
        await API.findByIdAndDelete(apiId);
        res.status(200).json({ message: 'API removed successfully', data: client });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Fetch all APIs for a client
router.get('/apis',authMiddleware, async (req, res) => {
    try {
        const clientId = req.user.clientId||req.body.clientId;
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'APIs fetched successfully', data: client.apis });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



module.exports = router;