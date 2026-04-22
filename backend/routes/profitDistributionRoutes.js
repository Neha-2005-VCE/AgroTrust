const express = require('express');
const router = express.Router();
const ProfitDistributionSnapshot = require('../models/ProfitDistributionSnapshot');
const { calculateProfitDistribution } = require('../helpers/profitDistribution');

// POST /api/profit-distribution/snapshot
router.post('/snapshot', async (req, res) => {
  try {
    const { investment_id, harvest_cycle, actual_yield, expected_yield, market_price, base_price, total_profit, base_share, max_investor_share } = req.body;
    if (!investment_id || !harvest_cycle) {
      return res.status(400).json({ error: 'investment_id and harvest_cycle required' });
    }
    const calc = calculateProfitDistribution({
      actual_yield,
      expected_yield,
      market_price,
      base_price,
      total_profit,
      base_share,
      max_investor_share
    });
    const snapshot = new ProfitDistributionSnapshot({
      investment_id,
      harvest_cycle,
      actual_yield,
      expected_yield,
      market_price,
      base_price,
      total_profit,
      investor_share_percent: calc.investor_share_percent,
      farmer_share_percent: calc.farmer_share_percent,
      investor_share_amount: calc.investor_share_amount,
      farmer_share_amount: calc.farmer_share_amount
    });
    await snapshot.save();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profit-distribution/:investment_id
router.get('/:investment_id', async (req, res) => {
  try {
    const snapshots = await ProfitDistributionSnapshot.find({ investment_id: req.params.investment_id });
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
