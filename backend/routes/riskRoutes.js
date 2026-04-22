const express = require('express');
const router = express.Router();
const RiskEvent = require('../models/RiskEvent');
const SupportFundPool = require('../models/SupportFundPool');
const { createRiskEvent, compensateFromSupportFund, addToSupportFund } = require('../services/riskService');

// POST /api/risk-events
router.post('/', async (req, res) => {
  try {
    const { type, triggered_by, affected_investment_ids, compensation_amount, details } = req.body;
    const event = await createRiskEvent({ type, triggered_by, affected_investment_ids, compensation_amount, details });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/risk-events/:investment_id
router.get('/:investment_id', async (req, res) => {
  try {
    const events = await RiskEvent.find({ affected_investment_ids: req.params.investment_id });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/support-fund/compensate
router.post('/support-fund/compensate', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const pool = await compensateFromSupportFund(amount, reason);
    res.json(pool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support-fund
router.get('/support-fund', async (req, res) => {
  try {
    let pool = await SupportFundPool.findOne();
    if (!pool) pool = new SupportFundPool({ total_amount: 0, history: [] });
    res.json(pool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
