const express = require('express');
const router = express.Router();
const IoTReading = require('../models/IoTReading');

// GET /iot/readings?projectId=...&sensorId=...
router.get('/readings', async (req, res) => {
  try {
    const { projectId, sensorId, limit = 50 } = req.query;
    const query = {};
    if (projectId) query.$or = [{ projectId }, { project_id: projectId }];
    if (sensorId) {
      query.$and = [
        ...(query.$and || []),
        { $or: [{ sensorId }, { sensor_id: sensorId }] },
      ];
    }
    const readings = await IoTReading.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ ok: true, readings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
