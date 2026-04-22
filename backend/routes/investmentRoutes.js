const express = require('express');
const router = express.Router();


const investmentsController = require('../controllers/investmentsController');

// POST /investments
router.post('/investments', investmentsController.createInvestment);

// POST /milestones/:projectId/approve
router.post('/milestones/:projectId/approve', investmentsController.approveMilestone);

module.exports = router;
