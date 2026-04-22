const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VirtualWallet = require('../models/VirtualWallet');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    let role = (req.body.role || 'farmer').toLowerCase();
    const allowedRoles = ['farmer', 'investor', 'buyer', 'expert'];
    if (!allowedRoles.includes(role)) role = 'farmer';

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const verificationStatus = role === 'farmer' ? 'pending' : 'approved';
    const user = await new User({ name, email, password, role, verificationStatus }).save();

    try {
      await new VirtualWallet({ userId: user._id, balance: 100000 }).save();
    } catch (walletErr) {
      if (walletErr.code !== 11000) {
        await User.deleteOne({ _id: user._id });
        return res.status(500).json({ error: 'Could not create wallet: ' + walletErr.message });
      }
    }

    res.status(201).json({ message: 'Registered successfully', userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      role: user.role,
      name: user.name,
      userId: user._id,
      verificationStatus: user.verificationStatus || 'approved',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
