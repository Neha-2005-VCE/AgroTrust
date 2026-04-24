const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  cropType: {
    type: String,
    trim: true
  },

  farmerName: {
    type: String,
    trim: true,
    default: ''
  },

  farmLocation: {
    type: String,
    trim: true,
    default: ''
  },

  phoneNumber: {
    type: String,
    trim: true,
    default: ''
  },

  cropName: {
    type: String,
    trim: true,
    default: ''
  },

  quantity: {
    type: Number,
    default: 0,
    min: 0
  },

  acres: {
    type: Number,
    default: 0,
    min: 0
  },

  expectedYield: {
    type: Number,
    default: 0,
    min: 0
  },

  targetFund: {
    type: Number,
    required: true,
    min: 0
  },

  farmerBudget: {
    type: Number,
    default: 0,
    min: 0
  },

  campaignTarget: {
    type: Number,
    default: 0,
    min: 0
  },

  mgsRate: {
    type: Number,
    default: 0.2,
    min: 0,
    max: 1
  },

  mgsAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  mgsStatus: {
    type: String,
    enum: ['locked', 'returned_to_investors', 'released_to_farmer'],
    default: 'locked'
  },

  fundedAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  escrowBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  releasedFunds: {
    type: Number,
    default: 0,
    min: 0
  },

  currentMilestone: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },

  milestoneStatus: {
    type: String,
    enum: ['pending', 'active', 'proof_submitted', 'verified', 'released'],
    default: 'pending'
  },

  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },

  riskPolicy: {
    type: String,
    enum: ['natural_disaster', 'negligence', 'market_drop'],
    default: 'natural_disaster'
  },

  txHash: {
    type: String,
    default: ''
  }

}, {
  timestamps: true   // 🔥 automatically adds createdAt & updatedAt
});

module.exports = mongoose.model('Project', projectSchema);