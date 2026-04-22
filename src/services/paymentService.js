// Minimal paymentService for gapPaymentService.js dependency
// Expand with real logic as needed
const Project = require('../../backend/models/Project');
const Transaction = require('../../backend/models/Transaction');

// Refund all project investors (stub)
async function refundAll({ projectId }) {
  // In production, refund logic should be implemented here
  // For now, just log and return
  console.log(`[paymentService] refundAll called for projectId: ${projectId}`);
  return { message: 'RefundAll stub called', projectId };
}

module.exports = {
  refundAll
};
