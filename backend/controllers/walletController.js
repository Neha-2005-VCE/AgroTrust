const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');

// Get wallet balance (auto-create if not exists)
exports.getWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid userId' });
    }
    let wallet = await Wallet.findOne({ userId: objectId });
    if (!wallet) {
      wallet = await Wallet.create({ userId: objectId });
    }
    res.json({ userId, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Add amount to wallet (used during investment)
exports.creditWallet = async (userId, amount, session = null) => {
  let wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) {
    wallet = await Wallet.create([{ userId, balance: amount }], { session });
    return wallet[0];
  }
  wallet.balance += amount;
  await wallet.save({ session });
  return wallet;
};
