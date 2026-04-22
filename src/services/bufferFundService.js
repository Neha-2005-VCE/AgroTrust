const Buffer = require('../../backend/models/Buffer');
const GapRequest = require('../../backend/models/GapRequest');
const Project = require('../../backend/models/Project');
const User = require('../../backend/models/User');
const GapEscrow = require('../../backend/models/GapEscrow');
const creditScoreService = require('./creditScoreService');

async function addToBuffer({ amount, sourceProjectId }) {
  let buffer = await Buffer.findOne({ bufferId: 'platform_buffer' });
  if (!buffer) {
    buffer = new Buffer({ bufferId: 'platform_buffer', totalBalance: 0, history: [] });
  }
  buffer.totalBalance += amount;
  buffer.history.push({
    type: 'deposit',
    amount,
    sourceProjectId,
    timestamp: new Date()
  });
  buffer.lastUpdated = new Date();
  await buffer.save();
  return buffer;
}

async function checkBufferBalance() {
  let buffer = await Buffer.findOne({ bufferId: 'platform_buffer' });
  if (!buffer) {
    buffer = new Buffer({ bufferId: 'platform_buffer', totalBalance: 0, history: [] });
    await buffer.save();
  }
  return { totalBalance: buffer.totalBalance, history: buffer.history };
}

async function deployBuffer({ gapRequestId, amount }) {
  const buffer = await Buffer.findOne({ bufferId: 'platform_buffer' });
  if (!buffer || buffer.totalBalance < amount) throw new Error('Insufficient buffer funds');
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('GapRequest not found');
  const farmer = await User.findById(gapRequest.farmerId);
  if (!farmer) throw new Error('Farmer not found');
  const project = await Project.findById(gapRequest.campaignId);
  if (!project) throw new Error('Project not found');
  if ((farmer.creditScore || 50) < 60) throw new Error('Farmer credit score below 60');
  if (gapRequest.amountRequested > project.targetFund * 0.3) throw new Error('Gap exceeds 30% of targetFund');
  if (gapRequest.abuseFlag === true) throw new Error('Gap request flagged for abuse');
  if (!gapRequest.iotDataSnapshot || gapRequest.iotDataSnapshot.thresholdMet !== false) throw new Error('IoT data does not confirm crisis');
  buffer.totalBalance -= amount;
  gapRequest.amountFilled += amount;
  // Update GapEscrow
  let gapEscrow = await GapEscrow.findOne({ gapRequestId });
  if (!gapEscrow) {
    gapEscrow = new GapEscrow({ gapRequestId, totalLocked: 0 });
  }
  gapEscrow.totalLocked += amount;
  // Add platform_buffer as a contribution
  gapRequest.contributions.push({
    investorId: 'platform_buffer',
    amount,
    returnRate: 0,
    layer: 3
  });
  buffer.history.push({
    type: 'deployment',
    amount: -amount,
    gapRequestId,
    timestamp: new Date()
  });
  buffer.lastUpdated = new Date();
  if (gapRequest.amountFilled >= gapRequest.amountRequested) {
    gapRequest.status = 'approved';
  }
  await buffer.save();
  await gapRequest.save();
  await gapEscrow.save();
  return {
    message: 'Buffer deployed',
    amountDeployed: amount,
    remainingBuffer: buffer.totalBalance
  };
}

module.exports = {
  addToBuffer,
  checkBufferBalance,
  deployBuffer
};
