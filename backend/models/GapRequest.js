const mongoose = require('mongoose');
const { Schema } = mongoose;

const ItemizedBreakdownSchema = new Schema({
  item: { type: String, required: true },
  cost: { type: Number, required: true },
  description: { type: String, required: true }
}, { _id: false });

const IoTDataSnapshotSchema = new Schema({
  soilMoisture: Number,
  temperature: Number,
  humidity: Number,
  thresholdMet: Boolean,
  capturedAt: Date
}, { _id: false });

const ContributionSchema = new Schema({
  investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  returnRate: { type: Number, required: true },
  contributedAt: { type: Date, default: Date.now },
  layer: { type: Number, required: true }
}, { _id: false });

const GapEscrowMilestoneSchema = new Schema({
  condition: { type: String, required: true },
  amount: { type: Number, required: true },
  released: { type: Boolean, default: false },
  releasedAt: Date,
  proofUploaded: { type: Boolean, default: false },
  proofUrl: String
}, { _id: false });

const GapRequestSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  farmerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amountRequested: { type: Number, required: true },
  amountFilled: { type: Number, default: 0 },
  reason: { type: String, required: true },
  itemizedBreakdown: [ItemizedBreakdownSchema],
  iotDataSnapshot: IoTDataSnapshotSchema,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'partial', 'wind_down'],
    default: 'pending'
  },
  currentLayer: { type: Number, enum: [1, 2, 3], default: 1 },
  layerDeadline: Date,
  contributions: [ContributionSchema],
  gapEscrowMilestones: [GapEscrowMilestoneSchema],
  gapEscrowBalance: { type: Number, default: 0 },
  gapEscrowStatus: {
    type: String,
    enum: ['inactive', 'active', 'released', 'refunded'],
    default: 'inactive'
  },
  blockchainTxHash: { type: String, default: '' },
  creditScoreImpact: { type: Number, default: 0 },
  abuseFlag: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

module.exports = mongoose.model('GapRequest', GapRequestSchema);
