const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const GapRequest = require('../models/GapRequest');
const gapPaymentService = require('../../src/services/gapPaymentService');
const SensorReading = require('../models/SensorReading');
const Project = require('../models/Project');

const bufferFundService = require('../../src/services/bufferFundService');
const abuseDetectionService = require('../../src/services/abuseDetectionService');

const GapEscrow = require('../models/GapEscrow');
const creditScoreService = require('../../src/services/creditScoreService');

// POST /api/gap/contribute/:gapRequestId [authMiddleware, investor only]
router.post('/contribute/:gapRequestId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'investor') return res.status(403).json({ error: 'Forbidden' });
    const { amount } = req.body;
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    if (gapRequest.status !== 'approved') return res.status(400).json({ error: 'Gap not open for funding' });
    if (gapRequest.layerDeadline && new Date() > gapRequest.layerDeadline) return res.status(400).json({ error: 'Funding window expired' });
    if (gapRequest.currentLayer === 2 && amount < 500) return res.status(400).json({ error: 'Minimum Rs 500 for micro-investors' });

    let returnRate = 18;
    if (gapRequest.currentLayer === 1) {
      returnRate = 18;
    } else if (gapRequest.currentLayer === 2) {
      returnRate = 20;
    }
    const result = await gapPaymentService.lockGapFunds({
      investorId: req.user.userId,
      gapRequestId: req.params.gapRequestId,
      amount,
      returnRate,
      layer: gapRequest.currentLayer
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/gap/upload-proof/:gapRequestId/:milestoneIndex [authMiddleware, farmer only]
router.post('/upload-proof/:gapRequestId/:milestoneIndex', authMiddleware, async (req, res) => {
  try {
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    const project = await Project.findById(gapRequest.campaignId);
    if (!project || req.user.userId !== project.farmer.toString()) return res.status(403).json({ error: 'Forbidden' });

    const milestone = gapRequest.gapEscrowMilestones[req.params.milestoneIndex];
    if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

    milestone.proofUploaded = true;
    milestone.proofUrl = req.body.proofUrl;
    await gapRequest.save();
    res.status(200).json({ message: 'Proof uploaded. Milestone ready for release.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/gap/release/:gapRequestId/:milestoneIndex [authMiddleware, farmer only]
router.post('/release/:gapRequestId/:milestoneIndex', authMiddleware, async (req, res) => {
  try {
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    console.log('[RELEASE DEBUG] gapRequest:', gapRequest);
    const project = await Project.findById(gapRequest.campaignId);
    if (!project) {
      console.error('[RELEASE DEBUG] Project not found for campaignId:', gapRequest.campaignId);
      return res.status(400).json({ error: 'Project not found for this gap request. Please check your data.' });
    }
    console.log('[RELEASE DEBUG] req.user:', req.user, '| project:', project, '| project.farmer:', project.farmer);
    if (!project.farmer) {
      console.error('[RELEASE DEBUG] Project missing farmer field:', project);
      return res.status(400).json({ error: 'Project is missing farmer field. Please fix the project data.' });
    }
    if (req.user.userId !== project.farmer.toString()) {
      console.error('[RELEASE DEBUG] User mismatch:', req.user.userId, 'vs', project.farmer.toString());
      return res.status(403).json({ error: 'Forbidden: user does not own this project.' });
    }

    const sensor = await SensorReading.findOne({ projectId: gapRequest.campaignId }).sort({ createdAt: -1 });
    if (!sensor || sensor.thresholdMet !== false) return res.status(400).json({ error: 'Sensor conditions not met for gap release' });

    const result = await gapPaymentService.releaseGapMilestone({
      gapRequestId: req.params.gapRequestId,
      milestoneIndex: req.params.milestoneIndex
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/gap/wind-down/:gapRequestId [authMiddleware, farmer only]
router.post('/wind-down/:gapRequestId', authMiddleware, async (req, res) => {
  try {
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    const project = await Project.findById(gapRequest.campaignId);
    if (!project || req.user.userId !== project.farmer.toString()) return res.status(403).json({ error: 'Forbidden' });

    const result = await gapPaymentService.triggerWindDown({
      gapRequestId: req.params.gapRequestId,
      projectId: gapRequest.campaignId
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/gap/check-expiry/:gapRequestId [authMiddleware]
router.post('/check-expiry/:gapRequestId', authMiddleware, async (req, res) => {
  try {
    const result = await gapPaymentService.checkLayerExpiry({ gapRequestId: req.params.gapRequestId });
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

// POST /api/gap/raise [authMiddleware, farmer only]
router.post('/raise', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Forbidden' });
    const { projectId, amountRequested, reason, itemizedBreakdown, iotDataSnapshot } = req.body;
    if (!projectId || !amountRequested || !reason || !itemizedBreakdown) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.farmer) {
      console.error('[GAP RAISE DEBUG] projectId:', projectId, '| project:', project, '| req.user:', req.user);
      return res.status(400).json({ error: 'Project is missing farmer field. Please fix the project data.' });
    }
    const farmerIdStr = String(project.farmer);
    const userIdStr = String(req.user.userId);
    console.log('[GAP RAISE DEBUG] projectId:', projectId, '| project.farmer:', farmerIdStr, '| req.user.userId:', userIdStr);
    if (farmerIdStr !== userIdStr) return res.status(403).json({ error: 'Not your project' });

    // Create GapRequest
    const gapRequest = await GapRequest.create({
      farmerId: req.user.userId,
      campaignId: projectId,
      amountRequested,
      reason,
      itemizedBreakdown,
      iotDataSnapshot: iotDataSnapshot || null,
      status: 'approved',
      currentLayer: 1,
      amountFilled: 0,
      abuseFlag: false,
      contributions: [],
      layerDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours for layer 1
      createdAt: new Date()
    });

    // Create GapEscrow
    await GapEscrow.create({
      gapRequestId: gapRequest._id,
      projectId,
      totalLocked: 0,
      breakdown: [],
      status: 'active'
    });

    // Optionally, run abuse check
    await abuseDetectionService.checkForAbuse({
      farmerId: req.user.userId,
      gapRequestId: gapRequest._id
    });

    // Optionally, apply repeated gap penalty
    await creditScoreService.applyRepeatedGapPenalty({
      farmerId: req.user.userId,
      projectId
    });

    res.status(201).json({ message: 'Gap request raised', gapRequest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/gap/buffer/balance [authMiddleware]
router.get('/buffer/balance', authMiddleware, async (req, res) => {
  try {
    const result = await bufferFundService.checkBufferBalance();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gap/abuse-check/:gapRequestId [authMiddleware]
router.post('/abuse-check/:gapRequestId', authMiddleware, async (req, res) => {
  try {
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    const result = await abuseDetectionService.checkForAbuse({
      farmerId: gapRequest.farmerId,
      gapRequestId: req.params.gapRequestId
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
