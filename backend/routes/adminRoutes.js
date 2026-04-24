const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const Investment = require('../models/Investment');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user || !['expert', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(authMiddleware, requireAdmin);

router.get('/overview', async (_req, res) => {
  try {
    const [usersByRole, projectsByStatus, investAgg] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Investment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    const users = Object.fromEntries(usersByRole.map((x) => [x._id, x.count]));
    const projects = Object.fromEntries(projectsByStatus.map((x) => [x._id, x.count]));
    const totalInvested = Number(investAgg?.[0]?.total || 0);

    res.json({ users, projects, totalInvested });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({})
      .select('_id name email role verificationStatus verificationRemark verificationUpdatedAt creditScore createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, verificationStatus, verificationRemark } = req.body;
    const allowedRoles = ['farmer', 'investor', 'buyer', 'expert', 'admin'];
    const allowedVerification = ['pending', 'approved', 'rejected', 'hold'];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const updates = {};
    if (role !== undefined) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role value' });
      }
      updates.role = role;
    }
    if (verificationStatus !== undefined) {
      if (!allowedVerification.includes(verificationStatus)) {
        return res.status(400).json({ error: 'Invalid verificationStatus value' });
      }
      updates.verificationStatus = verificationStatus;
      updates.verificationUpdatedAt = new Date();
      if (verificationRemark !== undefined) {
        updates.verificationRemark = String(verificationRemark || '').trim();
      }
    }
    const updated = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).select('_id name email role verificationStatus verificationRemark verificationUpdatedAt creditScore createdAt');
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmer-verifications', async (_req, res) => {
  try {
    const farmers = await User.find({ role: 'farmer' })
      .select('_id name email verificationStatus verificationRemark verificationUpdatedAt creditScore createdAt')
      .sort({ createdAt: -1 });
    res.json(farmers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects', async (_req, res) => {
  try {
    const projects = await Project.find({})
      .select('_id title farmerName farmLocation cropName cropType targetFund fundedAmount escrowBalance releasedFunds status milestoneStatus createdAt')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, milestoneStatus } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const updates = {};
    if (status) {
      const allowed = ['active', 'completed', 'failed'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      updates.status = status;
    }
    if (milestoneStatus) {
      const allowedMilestones = ['pending', 'active', 'proof_submitted', 'verified', 'released'];
      if (!allowedMilestones.includes(milestoneStatus)) {
        return res.status(400).json({ error: 'Invalid milestoneStatus value' });
      }
      updates.milestoneStatus = milestoneStatus;
    }
    const updated = await Project.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
