const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const GapRequest = require('../models/GapRequest');
const GapEscrow = require('../models/GapEscrow');
const Project = require('../models/Project');
const SensorReading = require('../models/SensorReading');
const User = require('../models/User');

// Utility: get user role from req
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Utility: admin or system
function requireAdminOrSystem(req, res, next) {
  if (!req.user || !['admin', 'system'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// 1. POST /api/gap/raise [authMiddleware, farmer only]
router.post('/raise', authMiddleware, requireRole('farmer'), async (req, res) => {
  try {
    const { projectId, amountRequested, reason, itemizedBreakdown } = req.body;
    if (!projectId || !amountRequested || !reason || !itemizedBreakdown) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // b. Find the project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // c. Verify ownership
    if (!project.farmer || req.user.userId !== project.farmer.toString()) {
      return res.status(403).json({ error: 'Not your project' });
    }

    // d. Project must be active
    if (project.status !== 'active') {
      return res.status(400).json({ error: 'Gap request only allowed on active projects' });
    }

    // e. Find latest SensorReading
    const sensor = await SensorReading.findOne({ projectId }).sort({ createdAt: -1 });
    if (!sensor) {
      return res.status(400).json({ error: 'No sensor data available. Cannot raise gap request.' });
    }

    // f. Validate gap amount
    const maxGapAllowed = project.targetFund * 0.30;
    if (amountRequested > maxGapAllowed) {
      return res.status(400).json({
        error: 'Gap amount exceeds 30% of original funding',
        maxAllowed: maxGapAllowed
      });
    }

    // g. Check for existing pending gap request
    const existing = await GapRequest.findOne({
      campaignId: projectId,
      farmerId: req.user.userId,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending gap request for this project' });
    }

    // h. Create GapRequest
    const gapRequest = await GapRequest.create({
      campaignId: projectId,
      farmerId: req.user.userId,
      amountRequested,
      reason,
      itemizedBreakdown,
      status: 'pending',
      currentLayer: 1,
      layerDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
      iotDataSnapshot: {
        soilMoisture: sensor.soilMoisture,
        temperature: sensor.temperature,
        humidity: sensor.humidity,
        thresholdMet: sensor.thresholdMet,
        capturedAt: sensor.createdAt
      }
    });

    return res.status(201).json(gapRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. GET /api/gap/:gapRequestId [authMiddleware]
router.get('/:gapRequestId', authMiddleware, async (req, res) => {
  try {
    const gapRequest = await GapRequest.findById(req.params.gapRequestId)
      .populate({ path: 'farmerId', select: 'name email' })
      .populate({ path: 'contributions.investorId', select: 'name' });
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });
    res.json(gapRequest);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. GET /api/gap/project/:projectId [authMiddleware]
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const list = await GapRequest.find({ campaignId: req.params.projectId })
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. GET /api/gap/open [public]
router.get('/open', async (req, res) => {
  try {
    const list = await GapRequest.find({ status: 'approved', currentLayer: 2 })
      .populate({ path: 'campaignId', select: 'title' })
      .populate({ path: 'farmerId', select: 'name' })
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. POST /api/gap/validate/:gapRequestId [authMiddleware, admin or system only]
router.post('/validate/:gapRequestId', authMiddleware, requireAdminOrSystem, async (req, res) => {
  try {
    const { approved, reason } = req.body;
    const gapRequest = await GapRequest.findById(req.params.gapRequestId);
    if (!gapRequest) return res.status(404).json({ error: 'Gap request not found' });

    if (!approved) {
      gapRequest.status = 'rejected';
      gapRequest.resolvedAt = new Date();
      if (reason) gapRequest.reason = reason;
      await gapRequest.save();
      return res.status(200).json(gapRequest);
    }

    // Approve
    gapRequest.status = 'approved';
    gapRequest.resolvedAt = new Date();
    if (reason) gapRequest.reason = reason;
    await gapRequest.save();

    // Create GapEscrow
    await GapEscrow.create({
      gapRequestId: gapRequest._id,
      projectId: gapRequest.campaignId,
      totalLocked: 0,
      breakdown: [],
      status: 'active'
    });

    // Notify investors (console log)
    console.log(`[NOTIFY] Investors: New approved gap request for project ${gapRequest.campaignId}`);

    return res.status(200).json(gapRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
