const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  agreement: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement', required: false, default: null },
  investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  amount: { type: Number, required: true },
  released: { type: Number, default: 0 },
  escrow: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Investment', investmentSchema);
