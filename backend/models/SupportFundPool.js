const mongoose = require('mongoose');

const supportFundHistorySchema = new mongoose.Schema({
  type: String, // deposit, compensation
  amount: Number,
  date: { type: Date, default: Date.now },
  reason: String
}, { _id: false });

const supportFundPoolSchema = new mongoose.Schema({
  total_amount: {
    type: Number,
    default: 0
  },
  history: [supportFundHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('SupportFundPool', supportFundPoolSchema);