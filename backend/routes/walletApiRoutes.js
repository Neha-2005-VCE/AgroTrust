const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

router.get('/wallets/:userId', walletController.getWallet);

module.exports = router;
