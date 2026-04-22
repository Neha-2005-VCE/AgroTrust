const express = require('express');
const router = express.Router();
const MinimumGuaranteedSupport = require('../models/MinimumGuaranteedSupport');
const Investment = require('../models/Investment');
const Escrow = require('../models/Escrow');

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
      // Release guarantee
      mgs.disbursement_status = 'released';
      mgs.failure_reason = failure_reason || 'Auto: Crop failure';
      await mgs.save();
      // Update Escrow
      await Escrow.findOneAndUpdate(
        { investment_id },
        { $set: { guarantee_released: true } }
      );
      // TODO: Add logic to transfer funds to farmer wallet
      return res.json({ released: true, mgs });
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
    mgs.disbursement_status = 'released';
    mgs.failure_reason = failure_reason || 'Manual admin trigger';
    await mgs.save();
    await Escrow.findOneAndUpdate(
      { investment_id },
      { $set: { guarantee_released: true } }
    );
    // TODO: Add logic to transfer funds to farmer wallet
    return res.json({ released: true, mgs });
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
