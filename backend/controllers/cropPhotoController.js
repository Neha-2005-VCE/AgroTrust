const mongoose = require('mongoose');
const CropPhoto = require('../models/CropPhoto');
const Farm = require('../models/Project'); // Assuming Project is the farm model
const Investment = require('../models/Investment');
const { notifyExpert, notifyFarmer } = require('../services/notificationService');
const cloudinary = require('../config/cloudinary');
const { attemptStageRelease } = require('../services/stageReleaseService');
const { returnPendingGuaranteesToInvestors } = require('../services/mgsService');

// 1. uploadPhoto
exports.uploadPhoto = async (req, res) => {
  try {
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'No file received' });
    }
    console.log('File buffer:', req.file.buffer);
    const { farm_id, investment_id, stage } = req.body;
    if (!farm_id || !investment_id || !stage) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    // Validate farm and investment exist
    const farm = await Farm.findById(farm_id);
    const investment = await Investment.findById(investment_id);
    if (!farm || !investment) {
      return res.status(400).json({ error: 'Invalid farm_id or investment_id.' });
    }

    // Convert farm_id and investment_id to ObjectId (make available to callback)
    const farmObjectId = new mongoose.Types.ObjectId(farm_id);
    const investmentObjectId = new mongoose.Types.ObjectId(investment_id);

    // Upload to cloudinary
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'crop_photos' },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary Error:', error);
          return res.status(500).json({ error: 'Cloudinary upload failed' });
        }
        try {
          const newPhoto = new CropPhoto({
            farm_id: farmObjectId,
            investment_id: investmentObjectId,
            photo_url: result.secure_url,
            stage,
            status: 'PENDING'
          });
          await newPhoto.save();
          await Farm.findByIdAndUpdate(farm_id, { $set: { milestoneStatus: 'proof_submitted' } });
          await notifyExpert(farm_id, result.secure_url, newPhoto.uploaded_at);
          res.status(200).json({ success: true, photo_id: newPhoto._id, photo_url: newPhoto.photo_url, status: 'PENDING' });
        } catch (error) {
          console.error('UPLOAD ERROR:', error);
          return res.status(500).json({ error: error.message });
        }
      }
    );
    stream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

function formatRelative(d) {
  if (!d) return 'Recently';
  const sec = Math.floor((Date.now() - new Date(d)) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// 2. verifyPhoto
exports.verifyPhoto = async (req, res) => {
  try {
    const photo_id = req.body.photo_id || req.body.photoId;
    let verdict = req.body.verdict || req.body.status;
    const remarks = req.body.remarks;

    if (!photo_id || verdict === undefined || verdict === null || verdict === '') {
      return res.status(400).json({ error: 'photo_id (or photoId) and verdict/status required.' });
    }

    const v = String(verdict).toLowerCase();
    if (v === 'approved' || v === 'approve') verdict = 'APPROVED';
    else if (v === 'rejected' || v === 'reject') verdict = 'REJECTED';
    else verdict = String(verdict).toUpperCase();

    if (!['APPROVED', 'REJECTED'].includes(verdict)) {
      return res.status(400).json({ error: 'Invalid verdict.' });
    }

    const photo = await CropPhoto.findById(photo_id);
    if (!photo) return res.status(400).json({ error: 'Photo not found.' });

    photo.status = verdict;
    photo.remarks = remarks || null;
    photo.expert_id = req.body.expert_id || req.user.id;
    photo.verified_at = new Date();
    await photo.save();

    if (verdict === 'APPROVED') {
      await Farm.findByIdAndUpdate(photo.farm_id, { $set: { milestoneStatus: 'verified' } });
    } else if (verdict === 'REJECTED') {
      await Farm.findByIdAndUpdate(photo.farm_id, { $set: { milestoneStatus: 'active' } });
    }

    let release = null;
    if (verdict === 'APPROVED') {
      release = await attemptStageRelease({
        projectId: photo.farm_id,
        stage: photo.stage,
        approvedBy: req.user.id,
        sourcePhotoId: photo._id,
      });

      if (String(photo.stage || '').toLowerCase() === 'harvest') {
        const mgsRelease = await returnPendingGuaranteesToInvestors(photo.farm_id, 'Harvest success MGS return');
        release = {
          ...release,
          mgsRelease,
        };
      }
    }
    // Notify farmer (fetch farmer email from investment or farm)
    let farmerEmail = '';
    if (photo.investment_id) {
      const investment = await Investment.findById(photo.investment_id).populate('investor');
      if (investment && investment.investor && investment.investor.email) {
        farmerEmail = investment.investor.email;
      }
    }
    if (farmerEmail) {
      try {
        await notifyFarmer(farmerEmail, verdict, remarks);
      } catch (notifyErr) {
        console.warn('notifyFarmer:', notifyErr.message);
      }
    }
    res.status(200).json({
      success: true,
      photo_id: photo._id,
      verdict,
      verified_at: photo.verified_at,
      release,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 3. getPendingVerifications — normalized array for UI
exports.getPendingVerifications = async (req, res) => {
  try {
    const pending = await CropPhoto.find({ status: 'PENDING' }).sort({ uploaded_at: 1 }).lean();
    const normalized = [];
    for (const photo of pending) {
      const farm = await Farm.findById(photo.farm_id).populate('farmer');
      const farmerName = farm?.farmer?.name || 'Farmer';
      const farmTitle = farm?.title || 'Project';
      normalized.push({
        _id: photo._id,
        imageUrl: photo.photo_url,
        farmerName,
        snippet: `Stage: ${photo.stage} — awaiting expert review`,
        title: `${photo.stage} milestone proof`,
        location: farmTitle,
        notes: `Photo submitted for stage "${photo.stage}" on project "${farmTitle}".`,
        amount: '0.00',
        creditScore: farm?.farmer?.creditScore != null ? String(farm.farmer.creditScore) : '—',
        tag: String(photo.stage || 'milestone')
          .replace(/-/g, ' ')
          .toUpperCase()
          .slice(0, 16),
        ago: formatRelative(photo.uploaded_at),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(farmerName)}`,
        raw: photo,
      });
    }
    res.status(200).json(normalized);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 4. getPhotoDetails
exports.getPhotoDetails = async (req, res) => {
  try {
    const { photo_id } = req.params;
    const photo = await CropPhoto.findById(photo_id).lean();
    if (!photo) return res.status(400).json({ error: 'Photo not found.' });
    const farm = await Farm.findById(photo.farm_id);
    const investment = await Investment.findById(photo.investment_id);
    photo.farm = farm || null;
    photo.investment = investment || null;
    res.status(200).json(photo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 6. getFarmPhotoHistory — list proof uploads per farm (project)
exports.getFarmPhotoHistory = async (req, res) => {
  try {
    const { farm_id } = req.params;
    if (!farm_id) {
      return res.status(400).json({ error: 'farm_id is required' });
    }

    // Optional: filter to a single investment (useful if multiple investors upload)
    const investmentId = req.query.investment_id || req.query.investmentId || null;
    const q = { farm_id };
    if (investmentId) q.investment_id = investmentId;

    const farm = await Farm.findById(farm_id).select('_id title farmer').lean();
    if (!farm) return res.status(404).json({ error: 'Project not found' });

    const items = await CropPhoto.find(q)
      .sort({ uploaded_at: -1 })
      .lean();

    res.json({
      farm: { _id: farm._id, title: farm.title, farmer: farm.farmer },
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch photo history' });
  }
};

// 5. reuploadPhoto
exports.reuploadPhoto = async (req, res) => {
  try {
    const { previous_photo_id } = req.body;
    if (!previous_photo_id || !req.file) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const oldPhoto = await CropPhoto.findById(previous_photo_id);
    if (!oldPhoto) return res.status(400).json({ error: 'Previous photo not found.' });
    if (oldPhoto.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Only rejected photos can be re-uploaded.' });
    }
    oldPhoto.status = 'REPLACED';
    await oldPhoto.save();
    // Upload new photo
    cloudinary.uploader.upload_stream({
      folder: 'crop_photos',
      resource_type: 'image',
    }, async (error, result) => {
      if (error) return res.status(400).json({ error: 'Cloudinary upload failed.' });
      const newPhoto = await CropPhoto.create({
        farm_id: oldPhoto.farm_id,
        investment_id: oldPhoto.investment_id,
        photo_url: result.secure_url,
        stage: oldPhoto.stage,
        status: 'PENDING',
        uploaded_at: new Date(),
      });
      await notifyExpert(newPhoto.farm_id, newPhoto.photo_url, newPhoto.uploaded_at);
      res.status(200).json({ success: true, new_photo_id: newPhoto._id, previous_photo_id });
    }).end(req.file.buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
