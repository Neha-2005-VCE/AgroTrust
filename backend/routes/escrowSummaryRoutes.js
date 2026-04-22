const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/escrow/locked
router.get('/locked', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user.id }).select('amount released');
    const totalLocked = investments.reduce((sum, inv) => {
      const amount = Number(inv.amount || 0);
      const released = Number(inv.released || 0);
      return sum + Math.max(amount - released, 0);
    }, 0);
    res.json({ totalLocked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/escrow/released
router.get('/released', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user.id }).select('released');
    const totalReleased = investments.reduce((sum, inv) => sum + Number(inv.released || 0), 0);
    res.json({ totalReleased });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
