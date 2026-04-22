const Agreement = require('../models/Agreement');
const Investment = require('../models/Investment');
const Project = require('../models/Project');

const mongoose = require('mongoose');
exports.createInvestment = async (req, res) => {
  console.log('Investment endpoint hit');
  try {
    const { projectId, investorId, amount } = req.body;
    const query = {
      projectId: new mongoose.Types.ObjectId(projectId),
      investorId: new mongoose.Types.ObjectId(investorId)
    };
    console.log('Looking for agreement with:', query);
    const allAgreements = await Agreement.find({});
    console.log('All agreements:', allAgreements.map(a => ({
      projectId: a.projectId,
      investorId: a.investorId,
      _id: a._id
    })));
    const agreement = await Agreement.findOne(query);
    if (!agreement) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    const initialRelease = (agreement.initialReleasePercent / 100) * amount;
    const escrowAmount = amount - initialRelease;
    const investment = await Investment.create({
      agreementId: agreement._id,
      investor: agreement.investorId,
      project: agreement.projectId,
      amount,
      released: initialRelease,
      escrow: escrowAmount
    });
    // Update project
    const project = await Project.findById(agreement.projectId);
    if (project) {
      project.fundedAmount = (project.fundedAmount || 0) + amount;
      project.escrowBalance = (project.escrowBalance || 0) + escrowAmount;
      project.releasedFunds = (project.releasedFunds || 0) + initialRelease;
      await project.save();
    }
    res.status(201).json({
      message: 'Investment created',
      investment,
      farmerCredited: initialRelease,
      escrowAmount
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
