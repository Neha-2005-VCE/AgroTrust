const mongoose = require('mongoose');

const MinimumGuaranteedSupportSchema = new mongoose.Schema({
  investment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment',
    required: true
  },
  guarantee_percent: {
    type: Number,
    required: true
  },
  guarantee_amount: {
    type: Number,
    required: true
  },
  disbursement_status: {
    type: String,
    enum: ['pending', 'released', 'failed'],
    default: 'pending'
  },
  failure_reason: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('MinimumGuaranteedSupport', MinimumGuaranteedSupportSchema);