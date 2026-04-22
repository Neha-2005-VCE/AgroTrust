const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const MarketplaceOrder = require('../models/MarketplaceOrder');

const router = express.Router();

router.post('/orders', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'buyer' && req.user.role !== 'investor' && req.user.role !== 'farmer') {
      return res.status(403).json({ error: 'Only logged-in users can place orders' });
    }
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    let total = 0;
    const normalized = items.map((i) => {
      const unit = Number(i.unitPrice) || 0;
      const qty = Number(i.qty) || 1;
      total += unit * qty;
      return {
        productId: i.productId ?? i.id,
        name: i.name || 'Item',
        qty,
        unitPrice: unit,
      };
    });
    const order = await MarketplaceOrder.create({
      buyerId: req.user.id,
      items: normalized,
      total,
    });
    res.status(201).json({ message: 'Order placed', orderId: order._id, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/me', authMiddleware, async (req, res) => {
  try {
    const orders = await MarketplaceOrder.find({ buyerId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
