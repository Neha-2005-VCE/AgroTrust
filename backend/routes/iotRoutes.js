const express = require('express');
const router = express.Router();
const { analyzeData } = require('../controllers/iotController');

router.post('/iot/analyze', analyzeData);

module.exports = router;
