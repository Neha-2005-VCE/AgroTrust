const express = require('express');
const router = express.Router();
const Agreement = require('../models/Agreement');

const User = require('../models/User');

// Create agreement (updated)
const mongoose = require('mongoose');
router.post('/', async (req, res) => {
  try {
    const { projectId, investorId, farmer, return_type } = req.body;
    let { initialReleasePercent, milestones } = req.body;
    if (!projectId || !investorId || !farmer || !return_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Set defaults if not provided
    if (typeof initialReleasePercent !== 'number') initialReleasePercent = 15;
    if (!Array.isArray(milestones) || milestones.length === 0) {
      milestones = [
        { name: 'Sowing', percent: 25 },
        { name: 'Growing', percent: 35 },
        { name: 'Pre-harvest', percent: 10 },
        { name: 'Harvest', percent: 15 }
      ];
    }
    const agreement = new Agreement({
      projectId: new mongoose.Types.ObjectId(projectId),
      investorId: new mongoose.Types.ObjectId(investorId),
      farmer: new mongoose.Types.ObjectId(farmer),
      return_type,
      initialReleasePercent,
      milestones,
      status: 'draft',
      farmer_signed: false,
      investor_signed: false
    });
    await agreement.save();
    res.status(201).json({ message: 'Agreement created', agreement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign agreement (farmer or investor)
router.post('/:id/sign', async (req, res) => {
  try {
    const { party } = req.body; // 'farmer' or 'investor'
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'draft' && agreement.status !== 'signed') {
      return res.status(400).json({ error: 'Agreement cannot be signed in current status' });
    }
    if (party === 'farmer') agreement.farmer_signed = true;
    if (party === 'investor') agreement.investor_signed = true;
    // If both signed, flip to active
    if (agreement.farmer_signed && agreement.investor_signed) {
      agreement.status = 'active';
    } else {
      agreement.status = 'signed';
    }
    await agreement.save();
    res.json(agreement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agreement by investment with debugging
router.get('/by-investment/:investment_id', async (req, res) => {
  const { investment_id } = req.params;
  console.log('Received investment_id:', investment_id);
  console.log('Type of investment_id:', typeof investment_id);

  // Check if valid ObjectId
  const isValid = mongoose.Types.ObjectId.isValid(investment_id);
  console.log('Is valid ObjectId:', isValid);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid investment_id' });
  }

  try {
    // Try with string
    let agreement = await Agreement.findOne({ investment_id: investment_id });
    console.log('Queried with:', investment_id);
    if (!agreement) {
      // Try with ObjectId
      const objectId = new mongoose.Types.ObjectId(investment_id);
      agreement = await Agreement.findOne({ investment_id: objectId });
      console.log('Queried with ObjectId:', objectId);
      if (!agreement) {
        // Log all agreements' investment_id for manual comparison
        const all = await Agreement.find({});
        console.log('All agreements investment_id values:', all.map(a => a.investment_id));
        return res.status(404).json({ error: 'Agreement not found' });
      }
    }
    res.json(agreement);
  } catch (err) {
    console.log('Error during agreement lookup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update milestone status
router.post('/:id/milestone-update', async (req, res) => {
  try {
    const { milestone_index, status } = req.body;
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!agreement.timeline_milestones[milestone_index]) {
      return res.status(400).json({ error: 'Milestone not found' });
    }
    agreement.timeline_milestones[milestone_index].status = status;
    await agreement.save();
    res.json(agreement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Get projectId by farmer and investor emails
router.get('/by-emails', async (req, res) => {
  const { farmerEmail, investorEmail } = req.query;
  if (!farmerEmail || !investorEmail) {
    return res.status(400).json({ error: 'Both farmerEmail and investorEmail are required' });
  }
  try {
    const farmer = await User.findOne({ email: farmerEmail });
    const investor = await User.findOne({ email: investorEmail });
    if (!farmer || !investor) {
      return res.status(404).json({ error: 'Farmer or investor not found' });
    }
    const agreement = await Agreement.findOne({ farmer: farmer._id, investorId: investor._id }).sort({ createdAt: -1 });
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    res.json({ projectId: agreement.projectId, agreementId: agreement._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
