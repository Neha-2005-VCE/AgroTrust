const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  percent: { type: Number, required: true }
}, { _id: false });


const agreementSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  return_type: { type: String, required: true },
  initialReleasePercent: { type: Number, required: true, min: 0, max: 100 },
  milestones: {
    type: [milestoneSchema],
    validate: v => Array.isArray(v) && v.length > 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Agreement', agreementSchema);