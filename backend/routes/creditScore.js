const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const creditScoreService = require('../services/creditScoreService');

// GET /api/credit/:farmerId [authMiddleware]
router.get('/:farmerId', authMiddleware, async (req, res) => {
  try {
    const farmer = await User.findById(req.params.farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    const score = farmer.creditScore || 50;
    const tier = creditScoreService.getScoreTier(score);
    res.json({ creditScore: score, tier, farmerId: farmer._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/credit/update-after-project/:projectId [authMiddleware]
router.post('/update-after-project/:projectId', authMiddleware, async (req, res) => {
  try {
    const result = await creditScoreService.updateScoreAfterProject({
      farmerId: req.user.userId,
      projectId: req.params.projectId
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
