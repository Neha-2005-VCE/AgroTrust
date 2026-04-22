const GapRequest = require('../../backend/models/GapRequest');
const GapEscrow = require('../../backend/models/GapEscrow');
const VirtualWallet = require('../../backend/models/VirtualWallet');
const Transaction = require('../../backend/models/Transaction');
const Project = require('../../backend/models/Project');
const paymentService = require('./paymentService');

async function lockGapFunds({ investorId, gapRequestId, amount, returnRate, layer }) {
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('Gap request not found');
  const wallet = await VirtualWallet.findOne({ userId: investorId });
  if (!wallet || wallet.balance < amount) throw new Error('Insufficient balance');
  wallet.balance -= amount;
  await wallet.save();

  let gapEscrow = await GapEscrow.findOne({ gapRequestId });
  if (!gapEscrow) {
    gapEscrow = await GapEscrow.create({
      gapRequestId,
      projectId: gapRequest.campaignId,
      totalLocked: 0,
      breakdown: [],
      status: 'active'
    });
  }
  gapEscrow.breakdown.push({ investorId, amount, returnRate, lockedAt: new Date() , layer });
  gapEscrow.totalLocked += amount;
  gapRequest.amountFilled += amount;
  gapRequest.contributions.push({ investorId, amount, returnRate, contributedAt: new Date(), layer });

  await Transaction.create({
    type: 'invest',
    fromId: investorId,
    toId: null,
    projectId: gapRequest.campaignId,
    amount,
    stage: 'Gap funding Layer ' + layer
  });

  if (gapRequest.amountFilled >= gapRequest.amountRequested) {
    gapRequest.status = 'approved';
    gapEscrow.status = 'active';
  }
  await gapEscrow.save();
  await gapRequest.save();

  return { message: 'Gap funds locked', totalFilled: gapRequest.amountFilled };
}

async function releaseGapMilestone({ gapRequestId, milestoneIndex }) {
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('Gap request not found');
  const milestone = gapRequest.gapEscrowMilestones[milestoneIndex];
  if (!milestone) throw new Error('Milestone not found');
  if (milestone.released) throw new Error('Already released');
  if (!milestone.proofUploaded) throw new Error('Proof not uploaded yet');

  const project = await Project.findById(gapRequest.campaignId);
  if (!project) throw new Error('Project not found');
  const farmerId = project.farmerId;

  const farmerWallet = await VirtualWallet.findOne({ userId: farmerId });
  if (!farmerWallet) throw new Error('Farmer wallet not found');
  farmerWallet.balance += milestone.amount;
  await farmerWallet.save();

  milestone.released = true;
  milestone.releasedAt = new Date();

  const gapEscrow = await GapEscrow.findOne({ gapRequestId });
  if (!gapEscrow) throw new Error('GapEscrow not found');
  gapEscrow.totalLocked -= milestone.amount;
  await gapEscrow.save();

  await Transaction.create({
    type: 'release',
    toId: farmerId,
    projectId: gapRequest.campaignId,
    amount: milestone.amount,
    stage: 'Gap milestone ' + milestoneIndex + ' released'
  });

  await gapRequest.save();
  return { releaseAmount: milestone.amount };
}

async function refundGapInvestors({ gapRequestId }) {
  const gapEscrow = await GapEscrow.findOne({ gapRequestId });
  if (!gapEscrow) throw new Error('GapEscrow not found');
  let totalRefunded = 0;
  for (const entry of gapEscrow.breakdown) {
    const wallet = await VirtualWallet.findOne({ userId: entry.investorId });
    if (wallet) {
      wallet.balance += entry.amount;
      await wallet.save();
    }
    await Transaction.create({
      type: 'refund',
      toId: entry.investorId,
      amount: entry.amount,
      stage: 'Gap request failed - refund'
    });
    totalRefunded += entry.amount;
  }
  gapEscrow.totalLocked = 0;
  gapEscrow.status = 'refunded';
  await gapEscrow.save();
  return { totalRefunded };
}

async function triggerWindDown({ gapRequestId, projectId }) {
  await refundGapInvestors({ gapRequestId });
  await paymentService.refundAll({ projectId });
  const project = await Project.findById(projectId);
  if (project) {
    project.status = 'failed';
    await project.save();
  }
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (gapRequest) {
    gapRequest.status = 'wind_down';
    await gapRequest.save();
  }
  return { message: 'Wind down complete' };
}

async function checkLayerExpiry({ gapRequestId }) {
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('Gap request not found');
  const now = new Date();
  if (gapRequest.layerDeadline && now > gapRequest.layerDeadline && gapRequest.amountFilled < gapRequest.amountRequested) {
    if (gapRequest.currentLayer === 1) {
      // Move to layer 2
      gapRequest.currentLayer = 2;
      gapRequest.layerDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
      // Eligibility check
      if (
        gapRequest.creditScoreImpact < 60 ||
        gapRequest.amountRequested > gapRequest.amountFilled * 1.3 ||
        !gapRequest.iotDataSnapshot ||
        gapRequest.iotDataSnapshot.thresholdMet !== false
      ) {
        gapRequest.currentLayer = 3;
      }
    } else if (gapRequest.currentLayer === 2) {
      gapRequest.currentLayer = 3;
      // Eligibility check
      if (
        gapRequest.creditScoreImpact < 60 ||
        gapRequest.amountRequested > gapRequest.amountFilled * 1.3 ||
        gapRequest.abuseFlag === true ||
        !gapRequest.iotDataSnapshot ||
        gapRequest.iotDataSnapshot.thresholdMet !== false
      ) {
        await triggerWindDown({ gapRequestId, projectId: gapRequest.campaignId });
      }
    } else if (gapRequest.currentLayer === 3) {
      await triggerWindDown({ gapRequestId, projectId: gapRequest.campaignId });
    }
    await gapRequest.save();
  }
  return gapRequest;
}

module.exports = {
  lockGapFunds,
  releaseGapMilestone,
  refundGapInvestors,
  triggerWindDown,
  checkLayerExpiry
};
