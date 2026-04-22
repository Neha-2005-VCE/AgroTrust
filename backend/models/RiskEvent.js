const mongoose = require('mongoose');

const riskEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['natural_disaster', 'farmer_negligence', 'market_price_drop', 'platform_failure'],
    required: true
  },
  triggered_by: {
    type: String,
    enum: ['weather_api', 'admin', 'activity_log', 'price_feed', 'ops_team'],
    required: true
  },
  affected_investment_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment'
  }],
  compensation_amount: {
    type: Number,
    default: 0
  },
  resolved_status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  details: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('RiskEvent', riskEventSchema);