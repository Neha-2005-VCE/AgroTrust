const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');
const { io } = require('../server');

router.post('/ingest', async (req, res) => {
  if (req.headers['x-api-key'] !== process.env.IOT_API_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const { sensorId, projectId, soilMoisture, temperature, humidity, timestamp } = req.body;
  if (!sensorId || !projectId || typeof soilMoisture !== 'number' || typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const thresholdMet = soilMoisture >= 40 && soilMoisture <= 70 && temperature >= 20 && temperature <= 35 && humidity >= 50 && humidity <= 80;
  const last3 = await SensorReading.find({ projectId }).sort({ timestamp: -1 }).limit(3);
  const alertTriggered = last3.length === 3 && last3.every(r => r.soilMoisture < 20) && soilMoisture < 20;
  const reading = new SensorReading({ sensorId, projectId, soilMoisture, temperature, humidity, thresholdMet, alertTriggered, timestamp: timestamp ? new Date(timestamp) : Date.now() });
  await reading.save();
  io.to(projectId.toString()).emit('sensor_update', { projectId, soilMoisture, temperature, humidity, thresholdMet, alertTriggered, timestamp: reading.timestamp });
  if (alertTriggered) {
    io.to(projectId.toString()).emit('sensor_alert', { projectId, alertType: "low_moisture", message: "Soil moisture critically low for 3 consecutive readings", timestamp: new Date() });
  }
  res.status(200).json({ message: "Sensor data ingested", thresholdMet, alertTriggered });
});

module.exports = router;
