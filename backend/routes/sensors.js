const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');
const authMiddleware = require('../middleware/authMiddleware');
const { io } = require('../server');
const { analyzeSensorData } = require('../services/insightService');
// POST /api/sensors/insights
// Accepts: { soilMoisture, temperature, humidity, sunlight }
// Returns: processed insights (JSON)
router.post('/insights', (req, res) => {
  const { soilMoisture, temperature, humidity, sunlight } = req.body;
  if (
    typeof soilMoisture !== 'number' ||
    typeof temperature !== 'number' ||
    typeof humidity !== 'number' ||
    typeof sunlight !== 'number'
  ) {
    return res.status(400).json({ error: 'All sensor values (soilMoisture, temperature, humidity, sunlight) must be numbers.' });
  }
  const insights = analyzeSensorData({ soilMoisture, temperature, humidity, sunlight });
  res.json(insights);
});

router.post('/simulate', authMiddleware, async (req, res) => {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: "projectId required" });
  const soilMoisture = Math.floor(Math.random() * 51) + 30;
  const temperature = Math.floor(Math.random() * 23) + 18;
  const humidity = Math.floor(Math.random() * 51) + 40;
  const thresholdMet = soilMoisture >= 40 && soilMoisture <= 70 && temperature >= 20 && temperature <= 35 && humidity >= 50 && humidity <= 80;
  const last3 = await SensorReading.find({ projectId }).sort({ timestamp: -1 }).limit(3);
  const alertTriggered = last3.length === 3 && last3.every(r => r.soilMoisture < 20) && soilMoisture < 20;
  const reading = new SensorReading({ sensorId: "SIMULATED", projectId, soilMoisture, temperature, humidity, thresholdMet, alertTriggered, timestamp: Date.now() });
  await reading.save();
  io.to(projectId.toString()).emit('sensor_update', { projectId, soilMoisture, temperature, humidity, thresholdMet, alertTriggered, timestamp: reading.timestamp });
  if (alertTriggered) {
    io.to(projectId.toString()).emit('sensor_alert', { projectId, alertType: "low_moisture", message: "Soil moisture critically low for 3 consecutive readings", timestamp: new Date() });
  }
  res.status(200).json(reading);
});

router.get('/:projectId', authMiddleware, async (req, res) => {
  const reading = await SensorReading.findOne({ projectId: req.params.projectId }).sort({ timestamp: -1 });
  if (!reading) return res.status(404).json({ error: "No sensor data found" });
  res.json(reading);
});

router.get('/history/:projectId', authMiddleware, async (req, res) => {
  const readings = await SensorReading.find({ projectId: req.params.projectId }).sort({ timestamp: -1 }).limit(10);
  res.json(readings);
});

module.exports = router;
