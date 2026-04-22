const express = require('express');
const router = express.Router();
const Wallet = require('../models/Wallet');
const Investment = require('../models/Investment');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/wallet/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.userId });
    const totalInvested = await Investment.aggregate([
      { $match: { userId: req.user.userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    res.json({
      balance: wallet ? wallet.balance : 0,
      totalInvested: totalInvested[0] ? totalInvested[0].total : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
