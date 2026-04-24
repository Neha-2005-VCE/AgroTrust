const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const authMiddleware = require('../middleware/authMiddleware');

function uniqueProjectsFromInvestments(investments) {
  const map = new Map();
  for (const inv of investments) {
    const p = inv?.project;
    if (p?._id) map.set(String(p._id), p);
  }
  return Array.from(map.values());
}

// GET /api/escrow/locked
router.get('/locked', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user.id }).populate('project');
    const projects = uniqueProjectsFromInvestments(investments);
    const totalLocked = projects.reduce((sum, p) => sum + Number(p.escrowBalance || 0), 0);
    res.json({ totalLocked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/escrow/released
router.get('/released', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user.id }).populate('project');
    const projects = uniqueProjectsFromInvestments(investments);
    const totalReleased = projects.reduce((sum, p) => sum + Number(p.releasedFunds || 0), 0);
    res.json({ totalReleased });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
