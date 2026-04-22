const mongoose = require('mongoose');

const escrowAccountSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', unique: true, required: true },
  totalLocked: { type: Number, default: 0 },
  breakdown: [
    {
      investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number },
      lockedAt: { type: Date, default: Date.now }
    }
  ],
  status: { type: String, enum: ['active', 'released', 'refunded'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EscrowAccount', escrowAccountSchema);
