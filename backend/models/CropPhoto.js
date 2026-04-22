const mongoose = require('mongoose');

const cropPhotoSchema = new mongoose.Schema({
  farm_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Project' },
  investment_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Investment' },
  photo_url: { type: String, required: true },
  stage: {
    type: String,
    enum: ['sowing', 'growing', 'pre-harvest', 'harvest'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    required: true
  },
  remarks: { type: String, default: null },
  expert_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verified_at: { type: Date, default: null },
  uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CropPhoto', cropPhotoSchema);
