const paymentService = require('./paymentService');
const EscrowAccount = require('../models/EscrowAccount');
const Transaction = require('../models/Transaction');

async function applyNaturalDisaster({ projectId }) {
  return await paymentService.refundAll({ projectId });
}

async function applyNegligence({ projectId }) {
  const escrow = await EscrowAccount.findOne({ projectId });
  if (!escrow) throw new Error('Escrow account not found');
  const originalTotal = escrow.totalLocked;

  await Transaction.create({
    type: 'refund',
    projectId,
    amount: originalTotal,
    stage: 'Negligence - no investor refund, escrow forfeited',
    blockchainTxHash: ''
  });

  escrow.totalLocked = 0;
  escrow.status = 'refunded';
  await escrow.save();

  return { message: "Escrow forfeited due to negligence", totalForfeited: originalTotal };
}

async function applyMarketDrop({ projectId }) {
  return await paymentService.refundAll({ projectId });
}

module.exports = { applyNaturalDisaster, applyNegligence, applyMarketDrop };
