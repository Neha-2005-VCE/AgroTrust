const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');

// GET /api/marketplace
router.get('/', async (req, res) => {
  try {
    const approvedFarmers = await User.find({
      role: 'farmer',
      $or: [{ verificationStatus: 'approved' }, { verificationStatus: { $exists: false } }],
    }).select('_id');
    const approvedFarmerIds = approvedFarmers.map((u) => u._id);
    const projects = await Project.find({ status: 'active', farmer: { $in: approvedFarmerIds } });
    // Add computed fields for UI
    const result = projects.map(p => ({
      _id: p._id,
      title: p.title,
      cropType: p.cropType,
      farmerName: p.farmerName,
      location: p.farmLocation,
      expectedReturn: p.expectedReturn || 0, // Add this to your model if needed
      riskLevel: p.riskPolicy || 'unknown',
      fundingProgress: p.targetFund ? Math.round((p.fundedAmount / p.targetFund) * 100) : 0,
      status: p.status
    }));
    res.json({ projects: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
