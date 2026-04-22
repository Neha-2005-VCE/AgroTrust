// models/Escrow.js
const mongoose = require('mongoose');

const escrowSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  totalLocked: { type: Number, default: 0 },
  guaranteed_frozen_amount: { type: Number, default: 0 },
  guarantee_released: { type: Boolean, default: false }
});

module.exports = mongoose.model('Escrow', escrowSchema);