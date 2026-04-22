const express = require('express');
const VirtualWallet = require('../models/VirtualWallet');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/wallet/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const wallet = await VirtualWallet.findOne({ userId: req.user.id });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.status(200).json({ balance: wallet.balance, userId: wallet.userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/:userId
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const wallet = await VirtualWallet.findOne({ userId: req.params.userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    res.status(200).json({ balance: wallet.balance, userId: wallet.userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
