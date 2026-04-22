const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const Wallet = require('../models/VirtualWallet');
const authMiddleware = require('../middleware/authMiddleware');
const MinimumGuaranteedSupport = require('../models/MinimumGuaranteedSupport');
const Agreement = require('../models/Agreement');

function requireInvestor(req, res, next) {
  if (!req.user || req.user.role !== 'investor') {
    return res.status(403).json({ error: 'Only investors can invest' });
  }
  next();
}

router.get('/my', authMiddleware, requireInvestor, async (req, res) => {
  try {
    const list = await Investment.find({ investor: req.user.id }).populate('project').sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, requireInvestor, async (req, res) => {
  try {
    const { projectId, amount } = req.body;
    const amt = Number(amount);
    if (!projectId || !amt || amt <= 0) {
      return res.status(400).json({ error: 'projectId and positive amount required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // One project can be funded only once.
    // If any investment already exists for this project, block reinvestment.
    const existingInvestment = await Investment.findOne({ project: projectId }).select('investor');
    if (existingInvestment) {
      return res.status(409).json({
        error: 'This project is already fully funded and cannot be invested again.',
      });
    }

    const targetFund = Number(project.targetFund || 0);
    const fundedAmount = Number(project.fundedAmount || 0);
    if (targetFund > 0 && fundedAmount >= targetFund) {
      return res.status(409).json({ error: 'This project is already fully funded.' });
    }
    const remaining = Math.max(targetFund - fundedAmount, 0);
    if (targetFund > 0 && amt > remaining) {
      return res.status(400).json({
        error: `Investment exceeds remaining requirement (${remaining}).`,
      });
    }

    // Resolve initial release percent from agreement (if available).
    // Fallback to 20% so funds are not shown as fully locked.
    const agreement = await Agreement.findOne({
      projectId: projectId,
      investorId: req.user.id,
    }).select('initialReleasePercent');
    const initialReleasePercentRaw = Number(agreement?.initialReleasePercent);
    const initialReleasePercent = Number.isFinite(initialReleasePercentRaw)
      ? Math.min(100, Math.max(0, initialReleasePercentRaw))
      : 20;
    const initialRelease = Math.round((amt * initialReleasePercent) / 100);
    const escrowAmount = Math.max(amt - initialRelease, 0);

    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user.id, balance: 100000 });
    }
    if (wallet.balance < amt) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    wallet.balance -= amt;
    await wallet.save();

    let escrow = await Escrow.findOne({ projectId });
    if (!escrow) {
      escrow = new Escrow({ projectId, totalLocked: escrowAmount, guaranteed_frozen_amount: 0 });
    } else {
      escrow.totalLocked += escrowAmount;
    }
    await escrow.save();

    const investment = new Investment({
      investor: req.user.id,
      project: projectId,
      amount: amt,
      released: initialRelease,
      escrow: escrowAmount,
      escrow_id: escrow._id,
    });
    await investment.save();

    project.fundedAmount = (project.fundedAmount || 0) + amt;
    project.escrowBalance = (project.escrowBalance || 0) + escrowAmount;
    project.releasedFunds = (project.releasedFunds || 0) + initialRelease;
    await project.save();

    const guarantee_percent = 0.2;
    const guarantee_amount = amt * guarantee_percent;
    const mgs = new MinimumGuaranteedSupport({
      investment_id: investment._id,
      guarantee_percent,
      guarantee_amount,
      disbursement_status: 'pending',
    });
    await mgs.save();
    escrow.guaranteed_frozen_amount = (escrow.guaranteed_frozen_amount || 0) + guarantee_amount;
    escrow.guarantee_released = false;
    await escrow.save();

    res.json({
      message: 'Investment successful',
      investedAmount: amt,
      releasedAmount: initialRelease,
      escrowLockedAmount: escrowAmount,
      initialReleasePercent,
      escrowBalance: escrow.totalLocked,
      investmentId: investment._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
