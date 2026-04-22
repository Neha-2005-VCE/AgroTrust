const mongoose = require('mongoose');

const IoTReadingSchema = new mongoose.Schema(
  {
    soilMoisture: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    sunlight: { type: Number, default: 50 },
    healthScore: { type: Number, default: 0 },
    riskLevel: { type: String, default: 'low' },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    investment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IoTReading', IoTReadingSchema);
