const express = require('express');
const router = express.Router();
const MinimumGuaranteedSupport = require('../models/MinimumGuaranteedSupport');
const Investment = require('../models/Investment');
const Escrow = require('../models/Escrow');
const Project = require('../models/Project');
const VirtualWallet = require('../models/VirtualWallet');
const CropPhoto = require('../models/CropPhoto');
const { releasePendingGuaranteesForProject, returnPendingGuaranteesToInvestors } = require('../services/mgsService');

// Helper: Calculate and freeze guarantee at investment creation
async function createMGSForInvestment(investment, percent) {
  const guarantee_amount = investment.amount * percent;
  const mgs = new MinimumGuaranteedSupport({
    investment_id: investment._id,
    guarantee_percent: percent,
    guarantee_amount,
    disbursement_status: 'pending',
  });
  await mgs.save();
  // Optionally, update Escrow to freeze this amount
  await Escrow.findByIdAndUpdate(investment.escrow_id, {
    $inc: { guaranteed_frozen_amount: guarantee_amount },
    $set: { guarantee_released: false }
  });
  return mgs;
}

// POST /api/mgs/trigger
router.post('/trigger', async (req, res) => {
  try {
    const { investment_id, actual_yield, failure_threshold, failure_reason } = req.body;
    const mgs = await MinimumGuaranteedSupport.findOne({ investment_id });
    if (!mgs) return res.status(404).json({ error: 'MGS not found' });
    if (mgs.disbursement_status !== 'pending') return res.status(400).json({ error: 'Already processed' });
    if (actual_yield <= failure_threshold) {
      const investment = await Investment.findById(investment_id);
      if (!investment) return res.status(404).json({ error: 'Investment not found' });
      const project = await Project.findById(investment.project);
      if (!project || !project.farmer) return res.status(404).json({ error: 'Project/Farmer not found' });
      const escrow = await Escrow.findOne({ projectId: investment.project });
      if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

      const guaranteeAmount = Number(mgs.guarantee_amount || 0);
      if (guaranteeAmount <= 0) {
        return res.status(400).json({ error: 'Invalid guarantee amount' });
      }
      if (Number(escrow.guaranteed_frozen_amount || 0) < guaranteeAmount) {
        return res.status(400).json({ error: 'Insufficient frozen guarantee in escrow' });
      }

      let farmerWallet = await VirtualWallet.findOne({ userId: project.farmer });
      if (!farmerWallet) {
        farmerWallet = await VirtualWallet.create({ userId: project.farmer, balance: 100000 });
      }
      farmerWallet.balance += guaranteeAmount;
      await farmerWallet.save();

      escrow.guaranteed_frozen_amount = Math.max(Number(escrow.guaranteed_frozen_amount || 0) - guaranteeAmount, 0);
      escrow.totalLocked = Math.max(Number(escrow.totalLocked || 0) - guaranteeAmount, 0);
      escrow.guarantee_released = true;
      await escrow.save();

      project.escrowBalance = Math.max(Number(project.escrowBalance || 0) - guaranteeAmount, 0);
      project.mgsStatus = 'released_to_farmer';
      await project.save();

      // Release guarantee
      mgs.disbursement_status = 'released';
      mgs.failure_reason = failure_reason || 'Auto: Crop failure';
      await mgs.save();
      return res.json({ released: true, mgs, amountReleased: guaranteeAmount });
    } else {
      return res.json({ released: false, mgs });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mgs/admin-trigger
router.post('/admin-trigger', async (req, res) => {
  try {
    const { investment_id, failure_reason } = req.body;
    const mgs = await MinimumGuaranteedSupport.findOne({ investment_id });
    if (!mgs) return res.status(404).json({ error: 'MGS not found' });
    if (mgs.disbursement_status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    const investment = await Investment.findById(investment_id);
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
    const project = await Project.findById(investment.project);
    if (!project || !project.farmer) return res.status(404).json({ error: 'Project/Farmer not found' });
    const escrow = await Escrow.findOne({ projectId: investment.project });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

    const guaranteeAmount = Number(mgs.guarantee_amount || 0);
    if (Number(escrow.guaranteed_frozen_amount || 0) < guaranteeAmount) {
      return res.status(400).json({ error: 'Insufficient frozen guarantee in escrow' });
    }

    let farmerWallet = await VirtualWallet.findOne({ userId: project.farmer });
    if (!farmerWallet) {
      farmerWallet = await VirtualWallet.create({ userId: project.farmer, balance: 100000 });
    }
    farmerWallet.balance += guaranteeAmount;
    await farmerWallet.save();

    escrow.guaranteed_frozen_amount = Math.max(Number(escrow.guaranteed_frozen_amount || 0) - guaranteeAmount, 0);
    escrow.totalLocked = Math.max(Number(escrow.totalLocked || 0) - guaranteeAmount, 0);
    escrow.guarantee_released = true;
    await escrow.save();

    project.escrowBalance = Math.max(Number(project.escrowBalance || 0) - guaranteeAmount, 0);
    project.mgsStatus = 'released_to_farmer';
    await project.save();

    mgs.disbursement_status = 'released';
    mgs.failure_reason = failure_reason || 'Manual admin trigger';
    await mgs.save();
    return res.json({ released: true, mgs, amountReleased: guaranteeAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mgs/release-harvest
router.post('/release-harvest', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const harvestPhoto = await CropPhoto.findOne({
      farm_id: project._id,
      stage: 'harvest',
      status: 'APPROVED',
    }).sort({ verified_at: -1, uploaded_at: -1 });

    if (!harvestPhoto) {
      return res.status(400).json({ error: 'Approved harvest photo not found' });
    }

    const harvestStageRelease = await require('../services/stageReleaseService').attemptStageRelease({
      projectId: project._id,
      stage: 'harvest',
    });

    const result = await returnPendingGuaranteesToInvestors(project._id, 'Harvest success MGS return');
    return res.json({ success: true, harvestStageRelease, mgsReturn: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mgs/:investment_id
router.get('/:investment_id', async (req, res) => {
  try {
    const mgs = await MinimumGuaranteedSupport.findOne({ investment_id: req.params.investment_id });
    if (!mgs) return res.status(404).json({ error: 'MGS not found' });
    res.json(mgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
