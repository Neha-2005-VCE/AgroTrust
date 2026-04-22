const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const Project = require('../models/Project');
const VirtualWallet = require('../models/VirtualWallet');
const authMiddleware = require('../middleware/authMiddleware');
const Escrow = require('../models/Escrow');

// Only allow investors to invest
function requireInvestor(req, res, next) {
  if (!req.user || req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Only investors can invest' });
  }
  next();
}

// POST /api/invest
router.post('/', authMiddleware, requireInvestor, async (req, res) => {
  try {
    const { projectId, amount, returnType } = req.body;
    if (!projectId || !amount) {
      return res.status(400).json({ error: 'projectId and amount are required' });
    }
    // Validate project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // Validate investor wallet
    const wallet = await VirtualWallet.findOne({ userId: req.user.id });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    // Deduct from wallet, prevent negative balance
    if (wallet.balance - amount < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    wallet.balance -= amount;
    await wallet.save();
    // Add to project fundedAmount
    project.fundedAmount = (project.fundedAmount || 0) + amount;
    await project.save();
    // Update escrow
    let escrow = await Escrow.findOne({ projectId });
    if (!escrow) {
      escrow = new Escrow({ projectId, totalLocked: 0 });
    }
    escrow.totalLocked += amount;
    await escrow.save();

    // Create investment record
    const investment = new Investment({
      investor: req.user.id,
      project: projectId,
      amount,
      returnType
    });
    await investment.save();

    // Call blockchain deposit
    let txHash = null;
    try {
      // Convert amount to ETH string if needed (assuming amount is in ETH, else convert)
      const ethAmount = amount.toString();
      const { depositToChain } = require('../blockchain/interact');
      txHash = await depositToChain(projectId, ethAmount);
      investment.txHash = txHash;
      await investment.save();
    } catch (blockchainErr) {
      // Optionally: handle blockchain failure (rollback, log, etc.)
      return res.status(500).json({ error: 'Investment saved but blockchain deposit failed', details: blockchainErr.message });
    }

    res.status(201).json({
      success: true,
      investment,
      txHash
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to invest' });
  }
});

module.exports = router;
