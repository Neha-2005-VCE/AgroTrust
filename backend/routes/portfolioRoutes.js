const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/portfolio
router.get('/', authMiddleware, async (req, res) => {
  try {
    const investments = await Investment.find({ investor: req.user.id })
      .populate('project')
      .sort({ createdAt: -1 });

    const projectMap = new Map();
    let totalInvested = 0;

    for (const inv of investments) {
      const amount = Number(inv.amount || 0);
      totalInvested += amount;

      const project = inv.project;
      if (project?._id) projectMap.set(String(project._id), project);
    }

    const projects = Array.from(projectMap.values());
    const totalReleased = projects.reduce((sum, p) => sum + Number(p.releasedFunds || 0), 0);
    const totalLocked = projects.reduce((sum, p) => sum + Number(p.escrowBalance || 0), 0);
    const activeProjects = projects.filter((p) => p.status !== 'failed').length;
    const cropTypes = new Set(
      projects.map((p) => p.cropType || p.cropName).filter(Boolean)
    );
    const diversityScore = activeProjects
      ? Math.round((cropTypes.size / activeProjects) * 100)
      : 0;

    res.json({
      activeProjects,
      diversityScore,
      totalInvested,
      totalLocked,
      totalReleased,
      projects,
      investments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
