const MinimumGuaranteedSupport = require('../models/MinimumGuaranteedSupport');
const Investment = require('../models/Investment');
const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const VirtualWallet = require('../models/VirtualWallet');
const Transaction = require('../models/Transaction');

async function getPendingMgsContext(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const investments = await Investment.find({ project: project._id }).select('_id project investor amount');
  if (!investments.length) {
    return { project, investments: [], pendingMgsRecords: [], escrow: null, totalGuarantee: 0 };
  }

  const investmentIds = investments.map((investment) => investment._id);
  const pendingMgsRecords = await MinimumGuaranteedSupport.find({
    investment_id: { $in: investmentIds },
    disbursement_status: 'pending',
  });

  if (!pendingMgsRecords.length) {
    return { project, investments, pendingMgsRecords: [], escrow: null, totalGuarantee: 0 };
  }

  const escrow = await Escrow.findOne({ projectId: project._id });
  if (!escrow) {
    throw new Error('Escrow not found for project');
  }

  const totalGuarantee = pendingMgsRecords.reduce((sum, record) => sum + Number(record.guarantee_amount || 0), 0);
  if (totalGuarantee <= 0) {
    throw new Error('Invalid guarantee amount');
  }
  if (Number(escrow.guaranteed_frozen_amount || 0) < totalGuarantee) {
    throw new Error('Insufficient frozen guarantee in escrow');
  }

  return { project, investments, pendingMgsRecords, escrow, totalGuarantee };
}

async function releasePendingGuaranteesForProject(projectId, failureReason = 'Crop failure support release') {
  const { project, pendingMgsRecords, escrow, totalGuarantee } = await getPendingMgsContext(projectId);
  if (!pendingMgsRecords.length) {
    return { released: false, amountReleased: 0, releasedItems: [] };
  }

  let farmerWallet = await VirtualWallet.findOne({ userId: project.farmer });
  if (!farmerWallet) {
    farmerWallet = await VirtualWallet.create({ userId: project.farmer });
  }
  farmerWallet.balance += totalGuarantee;
  await farmerWallet.save();

  for (const record of pendingMgsRecords) {
    record.disbursement_status = 'released';
    record.failure_reason = failureReason;
    await record.save();
  }

  escrow.guaranteed_frozen_amount = Math.max(Number(escrow.guaranteed_frozen_amount || 0) - totalGuarantee, 0);
  escrow.totalLocked = Math.max(Number(escrow.totalLocked || 0) - totalGuarantee, 0);
  escrow.guarantee_released = true;
  await escrow.save();

  project.escrowBalance = Math.max(Number(project.escrowBalance || 0) - totalGuarantee, 0);
  project.mgsStatus = 'released_to_farmer';
  await project.save();

  await Transaction.create({
    type: 'release',
    fromId: null,
    toId: project.farmer,
    projectId: project._id,
    amount: totalGuarantee,
    stage: 'mgs guarantee release to farmer',
    blockchainTxHash: '',
  });

  return {
    released: true,
    amountReleased: totalGuarantee,
    releasedItems: pendingMgsRecords.map((record) => ({
      investment_id: record.investment_id,
      guarantee_amount: record.guarantee_amount,
    })),
  };
}

async function returnPendingGuaranteesToInvestors(projectId, reason = 'Harvest success MGS return') {
  const { project, investments, pendingMgsRecords, escrow } = await getPendingMgsContext(projectId);
  if (!pendingMgsRecords.length) {
    return { returned: false, amountReturned: 0, returnedItems: [] };
  }

  const investmentMap = new Map(investments.map((inv) => [String(inv._id), inv]));
  const returnedItems = [];
  let processedTotal = 0;

  for (const record of pendingMgsRecords) {
    const investment = investmentMap.get(String(record.investment_id));
    if (!investment || !investment.investor) continue;

    let investorWallet = await VirtualWallet.findOne({ userId: investment.investor });
    if (!investorWallet) {
      investorWallet = await VirtualWallet.create({ userId: investment.investor });
    }

    const amount = Number(record.guarantee_amount || 0);
    if (amount <= 0) continue;

    investorWallet.balance += amount;
    await investorWallet.save();

    record.disbursement_status = 'released';
    record.failure_reason = reason;
    await record.save();

    await Transaction.create({
      type: 'refund',
      fromId: null,
      toId: investment.investor,
      projectId: project._id,
      amount,
      stage: 'mgs return to investor',
      blockchainTxHash: '',
    });

    returnedItems.push({
      investment_id: record.investment_id,
      investor_id: investment.investor,
      guarantee_amount: amount,
    });
    processedTotal += amount;
  }

  if (processedTotal <= 0) {
    return { returned: false, amountReturned: 0, returnedItems: [] };
  }

  escrow.guaranteed_frozen_amount = Math.max(Number(escrow.guaranteed_frozen_amount || 0) - processedTotal, 0);
  escrow.totalLocked = Math.max(Number(escrow.totalLocked || 0) - processedTotal, 0);
  escrow.guarantee_released = true;
  await escrow.save();

  project.escrowBalance = Math.max(Number(project.escrowBalance || 0) - processedTotal, 0);
  project.mgsStatus = 'returned_to_investors';
  await project.save();

  return {
    returned: true,
    amountReturned: processedTotal,
    returnedItems,
  };
}

module.exports = {
  releasePendingGuaranteesForProject,
  returnPendingGuaranteesToInvestors,
};