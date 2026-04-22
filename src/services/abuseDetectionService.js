const GapRequest = require('../../backend/models/GapRequest');
const User = require('../../backend/models/User');
const creditScoreService = require('./creditScoreService');

async function checkForAbuse({ farmerId, gapRequestId }) {
  const reasons = [];
  let abuseDetected = false;
  const gapRequest = await GapRequest.findById(gapRequestId);
  if (!gapRequest) throw new Error('GapRequest not found');
  // Scenario 1: Inflated gap amount
  const breakdown = gapRequest.itemizedBreakdown || [];
  const breakdownSum = breakdown.reduce((sum, item) => sum + (item.cost || 0), 0);
  if (breakdownSum < 0.8 * gapRequest.amountRequested) {
    abuseDetected = true;
    reasons.push('Gap amount significantly exceeds itemized breakdown');
  }
  // Scenario 2: Repeated gap requests this season
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const recentCount = await GapRequest.countDocuments({
    farmerId,
    createdAt: { $gte: since }
  });
  if (recentCount > 2) {
    abuseDetected = true;
    reasons.push('More than 2 gap requests in one season');
  }
  // Scenario 3: No IoT evidence of crisis
  if (gapRequest.iotDataSnapshot && gapRequest.iotDataSnapshot.thresholdMet === true) {
    abuseDetected = true;
    reasons.push('Sensor data shows no genuine crisis at time of request');
  }
  // Scenario 4: Previous abuse flag
  const previousAbuse = await GapRequest.exists({ farmerId, abuseFlag: true, _id: { $ne: gapRequestId } });
  if (previousAbuse) {
    abuseDetected = true;
    reasons.push('Farmer has previous abuse record');
  }
  if (abuseDetected) {
    gapRequest.abuseFlag = true;
    await gapRequest.save();
    await creditScoreService.updateScoreAfterGap({
      farmerId,
      gapRequestId,
      outcome: 'wind_down_negligence'
    });
  }
  return { abuseDetected, reasons };
}

async function generateAbuseReport({ farmerId }) {
  const gapRequests = await GapRequest.find({ farmerId }).sort({ createdAt: -1 });
  const totalRequests = gapRequests.length;
  const abuseFlagged = gapRequests.filter(g => g.abuseFlag).length;
  const lastRequest = gapRequests[0] ? gapRequests[0].createdAt : null;
  const user = await User.findById(farmerId);
  const creditScore = user ? (user.creditScore || 50) : null;
  const tier = user ? require('./creditScoreService').getScoreTier(creditScore) : null;
  let recommendation = 'allow';
  if (abuseFlagged > 1 || (creditScore !== null && creditScore < 30)) {
    recommendation = 'block';
  } else if (abuseFlagged === 1 || (creditScore !== null && creditScore < 60)) {
    recommendation = 'monitor';
  }
  return {
    totalRequests,
    abuseFlagged,
    creditScore,
    tier,
    lastRequest,
    recommendation
  };
}

module.exports = {
  checkForAbuse,
  generateAbuseReport
};
