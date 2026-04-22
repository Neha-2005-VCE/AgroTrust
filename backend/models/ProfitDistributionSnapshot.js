const mongoose = require('mongoose');

const profitDistributionSnapshotSchema = new mongoose.Schema({
  investment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Investment',
    required: true
  },
  harvest_cycle: {
    type: String,
    required: true
  },
  actual_yield: Number,
  expected_yield: Number,
  market_price: Number,
  base_price: Number,
  total_profit: Number,
  investor_share_percent: Number,
  farmer_share_percent: Number,
  investor_share_amount: Number,
  farmer_share_amount: Number
}, { timestamps: true });

module.exports = mongoose.model('ProfitDistributionSnapshot', profitDistributionSnapshotSchema);