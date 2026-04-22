const mongoose = require('mongoose');
const { Schema } = mongoose;

const bufferHistorySchema = new Schema({
  type: {
    type: String,
    enum: ['deposit', 'deployment'],
    required: true
  },
  amount: { type: Number, required: true },
  sourceProjectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  gapRequestId: { type: Schema.Types.ObjectId, ref: 'GapRequest' },
  timestamp: { type: Date, default: Date.now }
});

const bufferSchema = new Schema({
  bufferId: { type: String, default: 'platform_buffer', unique: true },
  totalBalance: { type: Number, default: 0 },
  history: [bufferHistorySchema],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Buffer', bufferSchema);
