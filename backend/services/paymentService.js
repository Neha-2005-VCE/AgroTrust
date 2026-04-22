const VirtualWallet = require('../models/VirtualWallet');
const EscrowAccount = require('../models/EscrowAccount');
const Transaction = require('../models/Transaction');
const Project = require('../models/Project');

async function lockFunds({ investorId, projectId, amount }) {
  const wallet = await VirtualWallet.findOne({ userId: investorId });
  if (!wallet || wallet.balance < amount) throw new Error('Insufficient balance');
  wallet.balance -= amount;
  await wallet.save();

  let escrow = await EscrowAccount.findOne({ projectId });
  if (!escrow) {
    escrow = new EscrowAccount({
      projectId,
      totalLocked: 0,
      breakdown: [],
      status: 'active'
    });
  }
  escrow.breakdown.push({ investorId, amount, lockedAt: new Date() });
  escrow.totalLocked += amount;
  await escrow.save();

  await Transaction.create({
    type: 'invest',
    fromId: investorId,
    toId: null,
    projectId,
    amount,
    stage: 'Investment locked in escrow',
    blockchainTxHash: ''
  });

  return escrow;
}


const { logMilestoneToChain } = require('../blockchain/interact');

// Milestone stage mapping
const milestonePercents = {
  sowing: 0.4,
  midseason: 0.3,
  harvest: 0.3
};

/**
 * Release milestone funds and log to blockchain
 * @param {String} projectId
 * @param {String} stage - 'sowing' | 'midseason' | 'harvest'
 */
async function releaseMilestone(projectId, stage) {
  const escrow = await EscrowAccount.findOne({ projectId });
  if (!escrow) throw new Error('Escrow account not found');
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');
  const farmerId = project.farmerId;
  const percent = milestonePercents[stage];
  if (!percent) throw new Error('Invalid milestone stage');
  const releaseAmount = Math.round(project.totalFunds * percent);

  // Update escrow in MongoDB
  escrow.totalLocked -= releaseAmount;
  if (escrow.totalLocked < 0) escrow.totalLocked = 0;
  await escrow.save();

  // Credit farmer wallet
  const farmerWallet = await VirtualWallet.findOne({ userId: farmerId });
  if (!farmerWallet) throw new Error('Farmer wallet not found');
  farmerWallet.balance += releaseAmount;
  await farmerWallet.save();

  // Call blockchain interaction
  const txHash = await logMilestoneToChain(projectId, stage);

  // Save transaction
  await Transaction.create({
    type: 'release',
    fromId: null,
    toId: farmerId,
    projectId,
    amount: releaseAmount,
    stage,
    blockchainTxHash: txHash
  });

  return { releaseAmount, farmerId, txHash };
}

async function refundAll({ projectId }) {
  const escrow = await EscrowAccount.findOne({ projectId });
  if (!escrow) throw new Error('Escrow account not found');
  let totalRefunded = 0;
  for (const entry of escrow.breakdown) {
    const wallet = await VirtualWallet.findOne({ userId: entry.investorId });
    if (wallet) {
      wallet.balance += entry.amount;
      await wallet.save();
    }
    await Transaction.create({
      type: 'refund',
      fromId: null,
      toId: entry.investorId,
      projectId,
      amount: entry.amount,
      stage: 'Project failed - refund',
      blockchainTxHash: ''
    });
    totalRefunded += entry.amount;
  }
  escrow.status = 'refunded';
  escrow.totalLocked = 0;
  await escrow.save();
  return { totalRefunded, investorsRefunded: escrow.breakdown.length };
}

module.exports = { lockFunds, releaseMilestone, refundAll };
