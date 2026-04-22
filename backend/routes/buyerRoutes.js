const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Project = require('../models/Project');
const MarketplaceOrder = require('../models/MarketplaceOrder');
const User = require('../models/User');

const router = express.Router();

function requireBuyer(req, res, next) {
  if (!req.user || req.user.role !== 'buyer') {
    return res.status(403).json({ error: 'Buyer access required' });
  }
  next();
}

function inventoryBase(project) {
  const qty = Number(project.quantity || 0);
  if (qty > 0) return qty;
  const expectedYield = Number(project.expectedYield || 0);
  if (expectedYield > 0) return expectedYield;
  const releasedFunds = Number(project.releasedFunds || 0);
  if (releasedFunds > 0) return Math.max(1, Math.round(releasedFunds / 100));
  return 1;
}

router.get('/completed-projects', authMiddleware, requireBuyer, async (_req, res) => {
  try {
    const projects = await Project.find({ status: 'completed' })
      .select('_id farmer title cropName cropType farmerName farmLocation expectedYield quantity releasedFunds')
      .sort({ updatedAt: -1 });
    const farmerIds = projects.map((p) => p.farmer).filter(Boolean);
    const farmers = await User.find({ _id: { $in: farmerIds } })
      .select('_id verificationStatus verificationRemark verificationUpdatedAt creditScore');
    const farmerById = new Map(farmers.map((f) => [String(f._id), f]));

    const orders = await MarketplaceOrder.find({})
      .select('items createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const aggByProject = new Map();
    for (const order of orders) {
      for (const item of order.items || []) {
        const pid = String(item.productId || '');
        if (!pid) continue;
        const prev = aggByProject.get(pid) || {
          soldQty: 0,
          totalOrders: 0,
          lastOrderAt: null,
        };
        prev.soldQty += Number(item.qty || 0);
        prev.totalOrders += 1;
        if (!prev.lastOrderAt || new Date(order.createdAt) > new Date(prev.lastOrderAt)) {
          prev.lastOrderAt = order.createdAt;
        }
        aggByProject.set(pid, prev);
      }
    }

    const enriched = projects.map((p) => {
      const stats = aggByProject.get(String(p._id)) || { soldQty: 0, totalOrders: 0, lastOrderAt: null };
      const totalQty = inventoryBase(p);
      const availableQty = Math.max(totalQty - stats.soldQty, 0);
      const farmerMeta = farmerById.get(String(p.farmer));
      return {
        ...p.toObject(),
        soldQty: stats.soldQty,
        availableQty,
        totalOrders: stats.totalOrders,
        lastOrderAt: stats.lastOrderAt,
        trustDetails: {
          verificationStatus: farmerMeta?.verificationStatus || 'approved',
          verificationUpdatedAt: farmerMeta?.verificationUpdatedAt || null,
          verificationRemark: farmerMeta?.verificationRemark || '',
          creditScore: Number(farmerMeta?.creditScore || 0),
        },
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase', authMiddleware, requireBuyer, async (req, res) => {
  try {
    const { projectId, quantity, unitPrice } = req.body;
    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!projectId || !qty || qty <= 0 || !price || price <= 0) {
      return res.status(400).json({ error: 'projectId, quantity, and unitPrice are required' });
    }

    const project = await Project.findById(projectId);
    if (!project || project.status !== 'completed') {
      return res.status(404).json({ error: 'Completed project not found' });
    }

    const relatedOrders = await MarketplaceOrder.find({
      'items.productId': project._id,
    }).select('items').lean();
    let soldQty = 0;
    for (const order of relatedOrders) {
      for (const item of order.items || []) {
        if (String(item.productId) === String(project._id)) {
          soldQty += Number(item.qty || 0);
        }
      }
    }
    const availableQty = Math.max(inventoryBase(project) - soldQty, 0);
    if (qty > availableQty) {
      return res.status(400).json({ error: `Only ${availableQty} units available right now` });
    }

    const total = qty * price;
    const order = await MarketplaceOrder.create({
      buyerId: req.user.id,
      items: [
        {
          productId: project._id,
          name: project.title,
          qty,
          unitPrice: price,
        },
      ],
      total,
    });

    res.status(201).json({
      message: 'Purchase order placed',
      orderId: order._id,
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/activity', authMiddleware, requireBuyer, async (req, res) => {
  try {
    const [myOrders, recentOrders] = await Promise.all([
      MarketplaceOrder.find({ buyerId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(20),
      MarketplaceOrder.find({})
        .sort({ createdAt: -1 })
        .limit(20),
    ]);
    res.json({ myOrders, marketFeed: recentOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
