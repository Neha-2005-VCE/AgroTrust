const Agreement = require('../models/Agreement');

exports.createAgreement = async (req, res) => {
  try {
    const { projectId, investorId, farmer, return_type, initialReleasePercent, milestones } = req.body;
    if (!projectId || !investorId || !farmer || !return_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const agreement = await Agreement.create({
      projectId,
      investorId,
      farmer,
      return_type,
      initialReleasePercent,
      milestones
    });
    res.status(201).json({ message: 'Agreement created', agreement });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
