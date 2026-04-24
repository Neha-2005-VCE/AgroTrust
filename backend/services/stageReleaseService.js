const Project = require('../models/Project');
const Escrow = require('../models/Escrow');
const Agreement = require('../models/Agreement');
const Investment = require('../models/Investment');
const VirtualWallet = require('../models/VirtualWallet');
const CropPhoto = require('../models/CropPhoto');
const Transaction = require('../models/Transaction');
const { logMilestoneToChain } = require('../blockchain/interact');

const STAGE_ORDER = ['sowing', 'growing', 'pre-harvest', 'harvest'];
const DEFAULT_STAGE_FRACTIONS = {
  sowing: 0.4,
  growing: 0.3,
  'pre-harvest': 0.2,
  harvest: 0.1,
};

function normalizeStage(stage) {
  return String(stage || '').trim().toLowerCase();
}

function toFraction(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 1) return n / 100;
  return n;
}

function getAgreementStageFraction(agreement, stage) {
  if (!agreement || !Array.isArray(agreement.milestones)) return null;
  const target = normalizeStage(stage).replace(/\s+/g, '-');
  const hit = agreement.milestones.find((m) => {
    const name = normalizeStage(m.name).replace(/\s+/g, '-');
    return name === target;
  });
  return hit ? toFraction(hit.percent) : null;
}

async function getApprovedPhotoForStage(projectId, stage) {
  return CropPhoto.findOne({
    farm_id: projectId,
    stage,
    status: 'APPROVED',
  }).sort({ verified_at: -1, uploaded_at: -1 });
}

async function canReleaseStageFunds({ projectId, stage }) {
  const project = await Project.findById(projectId);
  if (!project) {
    return { canRelease: false, reason: 'Project not found' };
  }

  const expectedStage = STAGE_ORDER[Number(project.currentMilestone || 0)];
  const normalizedStage = normalizeStage(stage || expectedStage).replace(/\s+/g, '-');
  if (!expectedStage || normalizedStage !== expectedStage) {
    return {
      canRelease: false,
      reason: `Stage not eligible yet. Expected ${expectedStage || 'none'}, got ${normalizedStage}`,
      project,
    };
  }

  const approvedPhoto = await getApprovedPhotoForStage(project._id, expectedStage);
  if (!approvedPhoto) {
    return {
      canRelease: false,
      reason: `No approved ${expectedStage} photo found`,
      project,
    };
  }

  return {
    canRelease: true,
    project,
    expectedStage,
    approvedPhoto,
  };
}

async function releaseStageFunds({ projectId, stage, approvedBy, sourcePhotoId }) {
  const normalizedStage = normalizeStage(stage).replace(/\s+/g, '-');
  if (!STAGE_ORDER.includes(normalizedStage)) {
    throw new Error('Invalid stage for release');
  }

  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  const expectedStage = STAGE_ORDER[Number(project.currentMilestone || 0)];
  if (expectedStage !== normalizedStage) {
    throw new Error(`Stage order mismatch. Expected ${expectedStage || 'none'}, got ${normalizedStage}`);
  }

  const escrow = await Escrow.findOne({ projectId: project._id });
  if (!escrow) throw new Error('Escrow not found for project');

  const guaranteedFrozen = Number(escrow.guaranteed_frozen_amount || 0);
  const availableForStages = Math.max(Number(escrow.totalLocked || 0) - guaranteedFrozen, 0);
  if (availableForStages <= 0) {
    throw new Error('No releasable stage funds in escrow');
  }

  const agreement = await Agreement.findOne({ projectId: project._id }).sort({ createdAt: -1 });
  const agreementFraction = getAgreementStageFraction(agreement, normalizedStage);
  const stageFraction = agreementFraction || DEFAULT_STAGE_FRACTIONS[normalizedStage];

  let releaseAmount;
  if (normalizedStage === 'harvest') {
    releaseAmount = availableForStages;
  } else {
    releaseAmount = Math.floor(availableForStages * stageFraction);
  }

  if (!Number.isFinite(releaseAmount) || releaseAmount <= 0) {
    throw new Error('Calculated stage release amount is invalid');
  }

  let farmerWallet = await VirtualWallet.findOne({ userId: project.farmer });
  if (!farmerWallet) {
    farmerWallet = await VirtualWallet.create({ userId: project.farmer });
  }
  farmerWallet.balance += releaseAmount;
  await farmerWallet.save();

  escrow.totalLocked = Math.max(Number(escrow.totalLocked || 0) - releaseAmount, 0);
  await escrow.save();

  // Keep investor-level release accounting aligned with project-level release updates.
  const investments = await Investment.find({ project: project._id }).sort({ createdAt: 1 });
  if (investments.length > 0) {
    const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    let remaining = releaseAmount;
    for (let i = 0; i < investments.length; i += 1) {
      const inv = investments[i];
      let share = 0;
      if (i === investments.length - 1) {
        share = remaining;
      } else {
        const ratio = totalInvested > 0 ? Number(inv.amount || 0) / totalInvested : 1 / investments.length;
        share = Math.floor(releaseAmount * ratio);
        remaining -= share;
      }

      inv.released = Number(inv.released || 0) + share;
      inv.escrow = Math.max(Number(inv.escrow || 0) - share, 0);
      await inv.save();
    }
  }

  project.escrowBalance = Math.max(Number(project.escrowBalance || 0) - releaseAmount, 0);
  project.releasedFunds = Number(project.releasedFunds || 0) + releaseAmount;
  project.currentMilestone = Number(project.currentMilestone || 0) + 1;
  project.milestoneStatus = 'released';
  if (project.currentMilestone >= STAGE_ORDER.length) {
    project.status = 'completed';
  }

  let txHash = '';
  try {
    txHash = await logMilestoneToChain(String(project._id), project.currentMilestone - 1);
  } catch (_err) {
    txHash = '';
  }

  await project.save();

  await Transaction.create({
    type: 'release',
    fromId: null,
    toId: project.farmer,
    projectId: project._id,
    amount: releaseAmount,
    stage: `${normalizedStage} stage release`,
    blockchainTxHash: txHash || '',
  });

  return {
    projectId: project._id,
    stage: normalizedStage,
    releaseAmount,
    txHash,
    milestone: project.currentMilestone,
    remainingEscrow: escrow.totalLocked,
  };
}

async function attemptStageRelease({ projectId, stage = null, approvedBy = null, sourcePhotoId = null } = {}) {
  const gate = await canReleaseStageFunds({ projectId, stage });
  if (!gate.canRelease) {
    return {
      released: false,
      pending: true,
      reason: gate.reason,
      projectId,
      stage: stage || gate.project?.currentMilestone,
    };
  }

  return {
    released: true,
    pending: false,
    ...(await releaseStageFunds({
      projectId,
      stage: gate.expectedStage,
      approvedBy,
      sourcePhotoId: sourcePhotoId || gate.approvedPhoto?._id,
    })),
  };
}

module.exports = {
  STAGE_ORDER,
  releaseStageFunds,
  attemptStageRelease,
  canReleaseStageFunds,
};
