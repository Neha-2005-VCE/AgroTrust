const mongoose = require('mongoose');
const milestoneSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: String,
  percentage: Number,
  approved: { type: Boolean, default: false },
  released: { type: Boolean, default: false }
});
module.exports = mongoose.model('Milestone', milestoneSchema);
