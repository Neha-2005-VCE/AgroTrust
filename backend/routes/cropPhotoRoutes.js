const express = require('express');
const router = express.Router();

const cropPhotoController = require('../controllers/cropPhotoController');
const upload = require('../middleware/upload');
const auth = require('../middleware/authMiddleware');

function requireExpert(req, res, next) {
	if (!req.user || !['expert', 'admin'].includes(req.user.role)) {
		return res.status(403).json({ error: 'Only experts/admin can access this' });
  }
  next();
}

// 1. POST /crop/photo/upload
router.post(
	'/crop/photo/upload',
	auth,
	upload.single('photo'),
	cropPhotoController.uploadPhoto
);

// 2. PATCH /crop/photo/verify
router.patch('/crop/photo/verify', auth, requireExpert, cropPhotoController.verifyPhoto);

// 3. POST /crop/photo/reupload
router.post(
	'/crop/photo/reupload',
	auth,
	upload.single('photo'),
	cropPhotoController.reuploadPhoto
);

// 4. GET /expert/pending-verifications
router.get('/expert/pending-verifications', auth, requireExpert, cropPhotoController.getPendingVerifications);

// 4b. GET /admin/pending-verifications (alias for admin UI compatibility)
router.get('/admin/pending-verifications', auth, requireExpert, cropPhotoController.getPendingVerifications);

// 5. GET /expert/photo/:photo_id
router.get('/expert/photo/:photo_id', auth, cropPhotoController.getPhotoDetails);

// 6. GET /crop/photo/history/:farm_id
router.get('/crop/photo/history/:farm_id', auth, cropPhotoController.getFarmPhotoHistory);

module.exports = router;
