const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const IoTReading = require('../models/IoTReading');
const paymentService = require('../services/paymentService');
const { logMilestoneToChain, refundOnChain } = require('../blockchain/interact');
const riskService = require('../services/riskService');
const Transaction = require('../models/Transaction');
const { io } = require('../server');

// POST /api/milestone/complete [authMiddleware, farmer only]
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.userId !== project.farmerId.toString()) {
      return res.status(403).json({ error: 'Not your project' });
    }
    if (project.currentMilestone >= 4) {
      return res.status(400).json({ error: 'All 4 milestones already completed' });
    }


    // IoT validation logic
    const latestReading = await IoTReading.findOne({ projectId }).sort({ timestamp: -1 });
    const thresholds = require('../constants/thresholds.json');
    if (!latestReading) {
      return res.status(400).json({ error: 'No sensor data received yet' });
    }
    if (!latestReading.thresholdMet) {
      return res.status(400).json({
        error: 'Sensor thresholds not met',
        readings: {
          soilMoisture: latestReading.soilMoisture,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity
        },
        thresholds
      });
    }

    const labels = [
      "Sowing complete",
      "Growing complete",
      "Flowering complete",
      "Harvest complete"
    ];
    const currentLabel = labels[project.currentMilestone];

    const { releaseAmount, farmerId } = await paymentService.releaseMilestonePayment({
      projectId,
      milestoneIndex: project.currentMilestone,
      milestoneLabel: currentLabel
    });

    // Update milestone in DB first
    project.currentMilestone += 1;
    if (project.currentMilestone === 4) project.status = 'completed';
    project.releasedFunds += releaseAmount;
    await project.save();

    // Log milestone on blockchain
    let txHash = null;
    try {
      txHash = await logMilestoneToChain(projectId, project.currentMilestone - 1);
      // Update the most recent release Transaction for this project
      await Transaction.findOneAndUpdate(
        { projectId, type: 'release' },
        { blockchainTxHash: txHash },
        { sort: { timestamp: -1 } }
      );
      project.txHash = txHash;
      await project.save();
    } catch (err) {
      return res.status(500).json({ error: 'Blockchain milestone log failed', details: err.message });
    }

    io.to(projectId.toString()).emit('milestone_released', {
      projectId,
      milestoneIndex: project.currentMilestone - 1,
      milestoneLabel: currentLabel,
      releaseAmount,
      txHash,
      newMilestone: project.currentMilestone
    });

    // TODO: Send email to farmer confirming release

    res.status(200).json({
      message: "Milestone released successfully",
      milestoneLabel: currentLabel,
      releaseAmount,
      txHash,
      newMilestone: project.currentMilestone,
      newEscrowBalance: project.escrowBalance - releaseAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/fail/:projectId [authMiddleware, farmer only]
router.post('/project/fail/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (req.user.userId !== project.farmerId.toString()) {
      return res.status(403).json({ error: 'Not your project' });
    }

    let result;
    if (project.riskPolicy === 'natural_disaster') {
      result = await riskService.applyNaturalDisaster({ projectId });
    } else if (project.riskPolicy === 'negligence') {
      result = await riskService.applyNegligence({ projectId });
    } else if (project.riskPolicy === 'market_drop') {
      result = await riskService.applyMarketDrop({ projectId });
    } else {
      return res.status(400).json({ error: 'Unknown risk policy' });
    }

    try {
      const chainResult = await refundOnChain(projectId);
      console.log('Blockchain refund result:', chainResult);
    } catch (err) {
      console.log('Blockchain refund failed:', err.message);
    }

    project.status = 'failed';
    project.escrowBalance = 0;
    await project.save();

    io.to(projectId.toString()).emit('project_failed', {
      projectId,
      riskPolicy: project.riskPolicy
    });

    res.status(200).json({
      message: "Project marked as failed",
      policy: project.riskPolicy
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
