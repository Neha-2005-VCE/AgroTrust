const User = require('../../backend/models/User');
const Project = require('../../backend/models/Project');
const GapRequest = require('../../backend/models/GapRequest');
const SensorReading = require('../../backend/models/SensorReading');

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function getScoreTier(score) {
  if (score >= 80) return 'Gold';
  if (score >= 60) return 'Silver';
  return 'Bronze';
}

async function updateScoreAfterProject({ farmerId, projectId }) {
  const changes = [];
  let delta = 0;
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');
  if (project.currentMilestone === 4) {
    delta += 10;
    changes.push('All 4 milestones completed: +10');
  }
  const sensors = await SensorReading.find({ projectId });
  if (sensors.length > 0 && sensors.every(s => s.thresholdMet === true)) {
    delta += 5;
    changes.push('All IoT data consistent: +5');
  }
  if (project.status === 'completed') {
    delta += 5;
    changes.push('Project completed on time: +5');
  }
  const farmer = await User.findById(farmerId);
  if (!farmer) throw new Error('Farmer not found');
  const oldScore = farmer.creditScore || 50;
  farmer.creditScore = clamp(oldScore + delta, 0, 100);
  await farmer.save();
  return { newScore: farmer.creditScore, changes };
}

async function updateScoreAfterGap({ farmerId, gapRequestId, outcome }) {
  let delta = 0;
  let change = '';
  switch (outcome) {
    case 'saved': change = 'Gap funded and crop saved: 0'; break;
    case 'partial': change = 'Partial funding, crop partially saved: 0'; break;
    case 'buffer_used': delta = -5; change = 'Buffer fund used: -5'; break;
    case 'wind_down_genuine': delta = -10; change = 'Wind-down (genuine crisis): -10'; break;
    case 'wind_down_negligence': delta = -20; change = 'Wind-down (negligence): -20'; break;
    case 'funds_returned': delta = 3; change = 'Gap funds returned unused: +3'; break;
    default: break;
  }
  const farmer = await User.findById(farmerId);
  if (!farmer) throw new Error('Farmer not found');
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('Gap request not found');
  if (gapRequest.abuseFlag) {
    delta -= 25;
    change += '; Abuse flag: -25';
  }
  const oldScore = farmer.creditScore || 50;
  farmer.creditScore = clamp(oldScore + delta, 0, 100);
  await farmer.save();
  return { newScore: farmer.creditScore, outcome, change };
}

async function applyRepeatedGapPenalty({ farmerId, projectId }) {
  const now = new Date();
  const year = now.getFullYear();
  const seasonStart = new Date(year, 0, 1); // Jan 1st
  const count = await GapRequest.countDocuments({
    farmerId,
    campaignId: projectId,
    createdAt: { $gte: seasonStart }
  });
  let penaltyApplied = 0;
  if (count > 1) {
    penaltyApplied = -5 * (count - 1);
    const farmer = await User.findById(farmerId);
    if (!farmer) throw new Error('Farmer not found');
    const oldScore = farmer.creditScore || 50;
    farmer.creditScore = clamp(oldScore + penaltyApplied, 0, 100);
    await farmer.save();
    return { newScore: farmer.creditScore, penaltyApplied };
  }
  return { penaltyApplied: 0 };
}

async function isEligibleForLayer2({ farmerId, gapRequestId }) {
  const farmer = await User.findById(farmerId);
  if (!farmer) return { eligible: false, reason: 'Farmer not found' };
  const creditScore = farmer.creditScore || 50;
  if (creditScore < 60) return { eligible: false, reason: 'Credit score below Silver tier' };
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) return { eligible: false, reason: 'Gap request not found' };
  const project = await Project.findById(gapRequest.campaignId);
  if (!project) return { eligible: false, reason: 'Project not found' };
  if (gapRequest.amountRequested > project.targetFund * 0.3) {
    return { eligible: false, reason: 'Gap exceeds 30% limit' };
  }
  if (!gapRequest.iotDataSnapshot || gapRequest.iotDataSnapshot.thresholdMet !== false) {
    return { eligible: false, reason: 'IoT data does not confirm crisis' };
  }
  return { eligible: true, tier: getScoreTier(creditScore) };
}

module.exports = {
  updateScoreAfterProject,
  updateScoreAfterGap,
  applyRepeatedGapPenalty,
  getScoreTier,
  isEligibleForLayer2
};
