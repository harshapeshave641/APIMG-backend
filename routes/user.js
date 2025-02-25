const express = require('express');
const router = express.Router();
const User = require('../schemas/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware'); 
const ApiKey = require('../schemas/apiKey'); 
const UserKey=require('../schemas/userKey')
const JWT_SECRET = process.env.JWT_SECRET;

router.get('/', authMiddleware, async (req, res) => {
    try {
        const users = await User.find()
        res.status(200).json({ message: 'Users fetched successfully', data: users });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Register a new user
router.post('/register', async (req, res) => {
    try {
        console.log(req.body)
        const { email, password, fullName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists!' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = new User({
            email,
            password: hashedPassword,
            fullName
        });

        
        await newUser.save();
        const newUserKey=new UserKey({
            userId:newUser._id,
            apis:[]
        })
        await newUserKey.save()
        const payload = { userId: newUser._id, email: newUser.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'User registered successfully', token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// User login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found!' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials!' });
        }

        const payload = { userId: user._id, email: user.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId||req.params.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User fetched successfully', data: user });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.put('/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const { email, password, fullName, isActive } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (email) user.email = email;
        if (password) {
            const saltRounds = 10;
            user.password = await bcrypt.hash(password, saltRounds);
        }
        if (fullName) user.fullName = fullName;
        if (isActive !== undefined) user.isActive = isActive;

        user.updatedAt = Date.now();
        await user.save();

        res.status(200).json({ message: 'User updated successfully', data: user });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.delete('/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/:userId/api-keys', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const { apiKeyId } = req.body;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const key=await ApiKey.findById(apiKeyId)
        if(!key||key.userId!==userId){
            res.status(400).json({message:"Invalid Api key"})
        }
        user.apiKeys.push(apiKeyId);
        await user.save();
        res.status(200).json({ message: 'API key added successfully', data: newApiKey });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.delete('/:userId/api-keys/:apiKeyId', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const apiKeyId = req.params.apiKeyId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.apiKeys = user.apiKeys.filter(id => id.toString() !== apiKeyId);
        await user.save();
        await ApiKey.findByIdAndDelete(apiKeyId);
        res.status(200).json({ message: 'API key removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/:userId/api-keys', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'API keys fetched successfully', data: user.apiKeys });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.get('/',authMiddleware, async(req,res)=>{
    const userId=req.params.userId;
    const user =await User.findById(userId);
})

module.exports = router;
