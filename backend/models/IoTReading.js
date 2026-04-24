const mongoose = require('mongoose');

const IoTReadingSchema = new mongoose.Schema(
  {
    sensorId: { type: String, default: '' },
    soilMoisture: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    sunlight: { type: Number, default: 50 },
    healthScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'low' },
    thresholdMet: { type: Boolean, default: null },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
    investment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: false },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IoTReading', IoTReadingSchema);
