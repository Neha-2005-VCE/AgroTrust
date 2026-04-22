const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'investor', 'buyer', 'expert'], default: 'farmer' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hold'],
    default: 'pending',
  },
  verificationRemark: { type: String, default: '' },
  verificationUpdatedAt: { type: Date, default: null },
  creditScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
