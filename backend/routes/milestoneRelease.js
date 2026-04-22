const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const VirtualWallet = require('../models/VirtualWallet');
const authMiddleware = require('../middleware/authMiddleware');

// Only allow farmers to release milestones
function requireFarmer(req, res, next) {
  if (!req.user || req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can release milestones' });
  }
  next();
}

// POST /api/milestone/complete
router.post('/complete', authMiddleware, requireFarmer, async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const escrow = await Escrow.findOne({ projectId });
    if (!escrow || escrow.totalLocked <= 0) {
      return res.status(400).json({ error: 'No funds in escrow' });
    }
    // Release 25% of escrow funds
    const releaseAmount = Math.floor(escrow.totalLocked * 0.25);
    if (releaseAmount <= 0) {
      return res.status(400).json({ error: 'Not enough funds to release milestone' });
    }
    // Add to farmer wallet
    const farmerWallet = await VirtualWallet.findOne({ userId: project.farmer });
    if (!farmerWallet) return res.status(404).json({ error: 'Farmer wallet not found' });
    farmerWallet.balance += releaseAmount;
    await farmerWallet.save();
    // Reduce escrow
    escrow.totalLocked -= releaseAmount;
    await escrow.save();
    res.json({ ok: true, released: releaseAmount, newWalletBalance: farmerWallet.balance, newEscrow: escrow.totalLocked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to release milestone' });
  }
});

module.exports = router;
