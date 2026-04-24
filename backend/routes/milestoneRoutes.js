const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { attemptStageRelease } = require('../services/stageReleaseService');

function requireExpertOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'expert' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Only expert/admin can release milestones' });
  }
  next();
}

router.post('/release-stage', authMiddleware, requireExpertOrAdmin, async (req, res) => {
  try {
    const { projectId, stage, sourcePhotoId } = req.body;
    if (!projectId || !stage) {
      return res.status(400).json({ error: 'projectId and stage are required' });
    }

    const result = await attemptStageRelease({
      projectId,
      stage,
      approvedBy: req.user.id,
      sourcePhotoId,
    });

    if (!result.released) {
      return res.status(400).json({ error: result.reason || 'Release conditions not met', release: result });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
