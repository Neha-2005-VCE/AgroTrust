const express = require('express');
const router = express.Router();
const IoTReading = require('../models/IoTReading');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/simulate', authMiddleware, async (req, res) => {
  try {
    const { projectId, investmentId } = req.body;
    if (!projectId || !investmentId) {
      return res.status(400).json({ error: 'projectId and investmentId are required' });
    }
    const soilMoisture = Math.floor(Math.random() * 61) + 20;
    const temperature = Math.floor(Math.random() * 21) + 15;
    const humidity = Math.floor(Math.random() * 61) + 30;
    const sunlight = Math.floor(Math.random() * 40) + 40;
    const healthScore = Math.min(100, Math.round(soilMoisture * 0.6 + humidity * 0.25 + (temperature - 15)));

    // Validate thresholds
    const { validateThreshold } = require('../helpers/validateThreshold');
    const soilOk = validateThreshold('soilMoisture', soilMoisture).valid;
    const tempOk = validateThreshold('temperature', temperature).valid;
    const humOk = validateThreshold('humidity', humidity).valid;
    const thresholdMet = soilOk && tempOk && humOk;

    const reading = new IoTReading({
      project_id: projectId,
      investment_id: investmentId,
      soilMoisture,
      temperature,
      humidity,
      sunlight,
      healthScore,
      riskLevel: healthScore > 70 ? 'low' : healthScore > 40 ? 'medium' : 'high',
      thresholdMet,
    });
    await reading.save();
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to simulate sensor data' });
  }
});

router.get('/history/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const readings = await IoTReading.find({ project_id: projectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sensor history' });
  }
});

router.get('/soil-moisture', async (req, res) => {
  try {
    const readings = await IoTReading.find({})
      .select('soilMoisture humidity temperature project_id createdAt')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
