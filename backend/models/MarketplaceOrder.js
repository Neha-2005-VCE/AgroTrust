const mongoose = require('mongoose');

const marketplaceOrderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        productId: mongoose.Schema.Types.Mixed,
        name: String,
        qty: { type: Number, default: 1 },
        unitPrice: Number,
      },
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ['placed', 'fulfilled', 'cancelled'], default: 'placed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketplaceOrder', marketplaceOrderSchema);
