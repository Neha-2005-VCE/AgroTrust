const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Investment = require('../models/Investment');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Only farmers can create
function requireFarmer(req, res, next) {
  if (!req.user || req.user.role !== 'farmer') {
    return res.status(403).json({ error: 'Only farmers can create projects' });
  }
  next();
}

async function ensureFarmerApproved(userId) {
  const farmer = await User.findById(userId).select('verificationStatus role');
  if (!farmer || farmer.role !== 'farmer') return { ok: false, code: 403, error: 'Farmer account not found' };
  const status = String(farmer.verificationStatus || 'pending');
  if (status === 'approved') return { ok: true };
  if (status === 'rejected') {
    return {
      ok: false,
      code: 403,
      error: 'Your farmer profile has been rejected by admin and is removed from the farmer dashboard.',
    };
  }
  if (status === 'hold') {
    return {
      ok: false,
      code: 403,
      error: 'Your farmer profile is on hold by admin.',
    };
  }
  return {
    ok: false,
    code: 403,
    error: 'Your farmer profile is pending verification.',
  };
}

function calculateCampaignTarget(farmerNeeds, mgsRate = 0.2) {
  const safeRate = Number.isFinite(Number(mgsRate)) ? Number(mgsRate) : 0.2;
  if (safeRate < 0 || safeRate >= 1) {
    throw new Error('mgsRate must be between 0 and 1');
  }
  const farmerBudget = Math.max(Number(farmerNeeds || 0), 0);
  const campaignTarget = farmerBudget / (1 - safeRate);
  const mgsAmount = campaignTarget - farmerBudget;
  return {
    farmerBudget,
    campaignTarget,
    mgsAmount,
    mgsRate: safeRate,
  };
}

// CREATE PROJECT
router.post('/', authMiddleware, requireFarmer, async (req, res) => {
  try {
    const gate = await ensureFarmerApproved(req.user.id);
    if (!gate.ok) return res.status(gate.code).json({ error: gate.error });

    const {
      title,
      description,
      cropType,
      targetFund,
      mgsRate,
      farmerName,
      farmLocation,
      phoneNumber,
      cropName,
      quantity,
      acres,
      expectedYield,
    } = req.body;

    const resolvedTitle =
      (title && String(title).trim()) ||
      (cropName && String(cropName).trim()
        ? `Farm Project · ${String(cropName).trim()}`
        : "");

    const resolvedFarmerNeeds = Number(targetFund);

    if (!resolvedTitle || !Number.isFinite(resolvedFarmerNeeds)) {
      return res.status(400).json({ error: 'Title and targetFund are required' });
    }

    const {
      farmerBudget,
      campaignTarget,
      mgsAmount,
      mgsRate: resolvedMgsRate,
    } = calculateCampaignTarget(resolvedFarmerNeeds, mgsRate);

    const project = new Project({
      title: resolvedTitle,
      description,
      cropType: cropType || cropName,
      targetFund: campaignTarget,
      farmerBudget,
      campaignTarget,
      mgsAmount,
      mgsRate: resolvedMgsRate,
      mgsStatus: 'locked',
      farmerName,
      farmLocation,
      phoneNumber,
      cropName,
      quantity: Number(quantity) || 0,
      acres: Number(acres) || 0,
      expectedYield: Number(expectedYield) || 0,
      farmer: req.user.id   // ✅ correct
    });

    await project.save();

    res.status(201).json(project);

  } catch (err) {
    console.error(err);  // 🔥 IMPORTANT
    res.status(500).json({ error: err.message });
  }
});

// GET ALL PROJECTS
router.get('/', async (req, res) => {
  try {
    const approvedFarmers = await User.find({
      role: 'farmer',
      $or: [{ verificationStatus: 'approved' }, { verificationStatus: { $exists: false } }],
    }).select('_id');
    const approvedFarmerIds = approvedFarmers.map((u) => u._id);

    const projects = await Project.find({
      status: 'active',
      farmer: { $in: approvedFarmerIds },
      $expr: { $lt: ['$fundedAmount', '$targetFund'] },
    }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmer/mine', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only farmers can list their farms' });
    }
    const gate = await ensureFarmerApproved(req.user.id);
    if (!gate.ok) return res.status(gate.code).json({ error: gate.error });
    const projects = await Project.find({ farmer: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/investments', authMiddleware, async (req, res) => {
  try {
    const list = await Investment.find({ project: req.params.id })
      .select('_id investor amount createdAt')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE PROJECT
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;