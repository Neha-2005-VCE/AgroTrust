const express = require('express');
const router = express.Router();
const IoTReading = require('../models/IoTReading');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { isWithinThreshold } = require('../helpers/iotHelpers');

module.exports = (io) => {
  // POST /iot/ingest
  router.post('/ingest', apiKeyAuth, async (req, res) => {
    try {
      const { sensorId, projectId, soilMoisture, temperature, humidity } = req.body;
      if (!sensorId || !projectId || soilMoisture == null || temperature == null || humidity == null) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }
      // Compute thresholdMet
      const readingObj = { sensorId, projectId, soilMoisture, temperature, humidity };
      const thresholdMet = isWithinThreshold(readingObj);
      // Save to DB
      const reading = new IoTReading({
        ...readingObj,
        project_id: projectId,
        thresholdMet,
      });
      await reading.save();
      // Emit latest reading
      io.emit('iot:update', reading);
      // Check last 3 readings for this sensor
      const last3 = await IoTReading.find({ sensorId }).sort({ timestamp: -1 }).limit(3);
      if (last3.length === 3 && last3.every(r => r.thresholdMet === false)) {
        io.emit('iot:alert', { sensorId, projectId, alert: 'Threshold not met for last 3 readings' });
      }
      return res.json({ ok: true, thresholdMet });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Server error' });
    }
  });
  return router;
};
