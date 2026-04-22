const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  soilMoisture: { type: Number, required: true },
  thresholdMet: { type: Boolean, default: false },
  alertTriggered: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

sensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
