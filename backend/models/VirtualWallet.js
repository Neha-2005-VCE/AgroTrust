const mongoose = require('mongoose');

const virtualWalletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  balance: { type: Number, default: 100000 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VirtualWallet', virtualWalletSchema);
