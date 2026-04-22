const mongoose = require('mongoose');
const Agreement = require('../models/Agreement');
const Project = require('../models/Project');
const Investment = require('../models/Investment');
const walletController = require('./walletController');
exports.createInvestment = async (req, res) => {
  console.log('--- [DEBUG] Received investment request ---');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    console.log('[DEBUG] Request body:', req.body);
    const { projectId, investorId, amount } = req.body;
    if (!projectId || !investorId || !amount) {
      console.log('[DEBUG] Missing required fields');
      return res.status(400).json({ error: 'projectId, investorId, and amount are required' });
    }

    // 1. Find agreement
    console.log('[DEBUG] Finding agreement...');
    const agreement = await Agreement.findOne({ projectId, investorId }).session(session);
    if (!agreement) {
      console.log('[DEBUG] Agreement not found');
      return res.status(404).json({ error: 'Agreement not found' });
    }
    console.log('[DEBUG] Agreement found:', agreement);

    // 2. Calculate initial release and escrow
    console.log('[DEBUG] Calculating amounts...');
    const totalAmount = Number(amount);
    const initialReleasePercent = agreement.initialReleasePercent || 20;
    const farmerAmount = (totalAmount * initialReleasePercent) / 100;
    const escrowAmount = totalAmount - farmerAmount;
    console.log('[DEBUG] totalAmount:', totalAmount, 'farmerAmount:', farmerAmount, 'escrowAmount:', escrowAmount);

    // 3. Update project
    console.log('[DEBUG] Finding project...');
    const project = await Project.findById(projectId).session(session);
    if (!project) {
      console.log('[DEBUG] Project not found');
      return res.status(404).json({ error: 'Project not found' });
    }
    console.log('[DEBUG] Project before update:', project);

    project.fundedAmount = (project.fundedAmount || 0) + totalAmount;
    project.escrowBalance = (project.escrowBalance || 0) + escrowAmount;
    project.releasedFunds = (project.releasedFunds || 0) + farmerAmount;

    console.log('[DEBUG] Project after update:', project);
    // 4. Save project
    console.log('[DEBUG] Saving project...');
    await project.save();
    console.log('[DEBUG] Project saved.');

    // 5. Credit farmer wallet
    if (!agreement.farmer) {
      console.error('[ERROR] Agreement is missing farmer field:', agreement);
      throw new Error('Agreement is missing farmer field. Cannot credit wallet.');
    }
    console.log('[DEBUG] Crediting farmer wallet...');
    await walletController.creditWallet(agreement.farmer, farmerAmount, session);
    console.log('[DEBUG] Farmer wallet credited.');

    // 6. Return response
    console.log('[DEBUG] Sending response...');
    await session.commitTransaction();
    res.status(201).json({
      message: 'Investment processed successfully',
      totalAmount,
      farmerCredited: farmerAmount,
      escrowStored: escrowAmount
    });
    console.log('[DEBUG] Response sent.');
  } catch (err) {
    console.error('[DEBUG] Caught error:', err);
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};

exports.approveMilestone = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { projectId } = req.params;
    const { milestoneId } = req.body;

    const milestone = await Milestone.findById(milestoneId).session(session);
    if (!milestone || milestone.project.toString() !== projectId) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    if (milestone.released) {
      return res.status(400).json({ error: 'Milestone already released' });
    }

    // Find all investments for this project
    const investments = await Investment.find({ project: projectId }).session(session);
    for (const investment of investments) {
      const escrow = await Escrow.findOne({ investment: investment._id }).session(session);
      if (!escrow) continue;

      const releaseAmount = (milestone.percentage / 100) * investment.escrow;
      if (escrow.released + releaseAmount > escrow.amount) {
        return res.status(400).json({ error: 'Release exceeds escrow' });
      }

      // Update farmer wallet
      const agreement = await Agreement.findById(investment.agreement).session(session);
      const farmerWallet = await Wallet.findOne({ user: agreement.farmer }).session(session);
      farmerWallet.balance += releaseAmount;
      await farmerWallet.save();

      // Update escrow
      escrow.released += releaseAmount;
      escrow.milestonesReleased.push(milestone._id);
      await escrow.save();

      // Update investment
      investment.released += releaseAmount;
      investment.escrow -= releaseAmount;
      await investment.save();

      // Create transaction
      await Transaction.create([{
        from: investment.investor,
        to: agreement.farmer,
        amount: releaseAmount,
        type: 'release',
        reference: milestone._id
      }], { session });
    }

    milestone.released = true;
    milestone.approved = true;
    await milestone.save();

    await session.commitTransaction();
    res.json({ message: 'Milestone approved and funds released' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
};
