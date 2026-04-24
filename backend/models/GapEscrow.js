const mongoose = require('mongoose');
const { Schema } = mongoose;

const BreakdownSchema = new Schema({
  investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  returnRate: { type: Number, required: true },
  layer: { type: Number, default: 1 },
  lockedAt: { type: Date, default: Date.now }
}, { _id: false });

const GapEscrowSchema = new Schema({
  gapRequestId: { type: Schema.Types.ObjectId, ref: 'GapRequest', required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  totalLocked: { type: Number, default: 0 },
  breakdown: [BreakdownSchema],
  status: {
    type: String,
    enum: ['active', 'released', 'refunded'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GapEscrow', GapEscrowSchema);
