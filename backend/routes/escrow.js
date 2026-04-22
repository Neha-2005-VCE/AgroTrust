const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Escrow = require('../models/Escrow');

// GET /api/escrow/:projectId
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Let other explicit routes like /locked and /released handle non-ObjectId paths.
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next();
    }

    const escrow = await Escrow.findOne({ projectId });

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    res.json({
      projectId,
      totalLocked: escrow.totalLocked
    });

  } catch (err) {
    console.error(err);   // 🔥 shows real error
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;