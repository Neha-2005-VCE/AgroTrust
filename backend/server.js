const investmentRoutes = require('./routes/investmentRoutes');
const iotReadingsRoutes = require('./routes/iotReadings');

const path = require('path');
const dotenv = require('dotenv');
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  dotenv.config({ path: path.join(__dirname, 'env') });
}
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  console.log('POLYGON_RPC_URL:', process.env.POLYGON_RPC_URL || '(unset)');
  console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS || '(unset)');
  console.log('PLATFORM_PRIVATE_KEY:', process.env.PLATFORM_PRIVATE_KEY ? '[set]' : '[unset]');
}

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');


const cropPhotoRoutes = require('./routes/cropPhotoRoutes');
const walletApiRoutes = require('./routes/walletApiRoutes');
const iotRoutes = require('./routes/iotRoutes');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: isDev
    ? { origin: true, methods: ['GET', 'POST'] }
    : {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
      },
});

// ======== GAP FUNDING SCHEDULER IMPORTS ========
const gapPaymentService = require('../src/services/gapPaymentService');
const creditScoreService = require('../src/services/creditScoreService');
const bufferFundService = require('../src/services/bufferFundService');
const GapRequest = require('./models/GapRequest');

// ================== BLOCKCHAIN IMPORTS ==================
const {
  createProjectOnChain,
  depositToChain,
  logMilestoneToChain,
  refundOnChain,
  getChainProject
} = require("./blockchain/interact");

// ================== MIDDLEWARE ==================
const CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || CORS_ORIGINS.includes(origin)) return cb(null, true);
      if (isDev) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// Use investmentRoutes at /api
app.use('/api', investmentRoutes);

// ================== DATABASE ==================
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
} else {
  console.warn('MONGO_URI is unset; starting backend without a database connection.');
}

// ================== ROUTES ==================

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', walletApiRoutes);
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/invest', require('./routes/investRoutes'));
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/milestone', require('./routes/milestoneRoutes'));
app.use('/api/escrow', require('./routes/escrow'));
app.use('/api/sensors', require('./routes/sensorRoutes'));
app.use('/api/mgs', require('./routes/mgsRoutes'));
app.use('/api/profit-distribution', require('./routes/profitDistributionRoutes'));
app.use('/api/agreements', require('./routes/agreementRoutes'));
app.use('/api/risk-events', require('./routes/riskRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/buyer', require('./routes/buyerRoutes'));
// === NEW SUMMARY & LISTING ROUTES ===
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/marketplace', require('./routes/marketplaceListRoutes'));
app.use('/api/escrow', require('./routes/escrowSummaryRoutes'));
app.use('/api/wallet', require('./routes/walletSummaryRoutes'));
app.use('/api', cropPhotoRoutes);
app.use('/api/gap', require('./routes/gapFunding'));
app.use('/api/gap', require('./routes/gapRequest'));
app.use('/api/iot', iotReadingsRoutes);
// Move iotRoutes to the end before error handler
app.use('/api', iotRoutes);


// ================== DIRECT TEST ROUTE ==================
app.post('/api/iot/analyze', (req, res) => {
  res.send('Direct route working');
});

// ================== BLOCKCHAIN ROUTES ==================


// Create a new project on-chain
app.post('/api/blockchain/projects', async (req, res) => {
  try {
    const { projectId, farmerAddress } = req.body;
    const tx = await createProjectOnChain(projectId, farmerAddress);
    res.json({ success: true, message: "Project created on-chain", tx });
  } catch (err) {
    console.error('[ERROR createProject]', err);
    res.status(500).json({ error: err.message });
  }
});

// Deposit funds to a project
app.post('/api/blockchain/deposits', async (req, res) => {
  try {
    const { projectId, amountEth } = req.body;
    const tx = await depositToChain(projectId, amountEth);
    res.json({ success: true, message: "Deposit successful", tx });
  } catch (err) {
    console.error('[ERROR deposit]', err);
    res.status(500).json({ error: err.message });
  }
});

// Release milestone for a project
app.post('/api/blockchain/milestones', async (req, res) => {
  try {
    const { projectId, stage } = req.body;
    const tx = await logMilestoneToChain(projectId, stage);
    res.json({ success: true, message: "Milestone released", tx });
  } catch (err) {
    console.error('[ERROR milestone]', err);
    res.status(500).json({ error: err.message });
  }
});

// Refund a project
app.post('/api/blockchain/refund', async (req, res) => {
  try {
    const { projectId } = req.body;
    const tx = await refundOnChain(projectId);
    res.json({ success: true, message: "Refund successful", tx });
  } catch (err) {
    console.error('[ERROR refund]', err);
    res.status(500).json({ error: err.message });
  }
});

// Get project details from chain
app.get('/api/blockchain/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const data = await getChainProject(projectId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[ERROR get project]', err);
    res.status(500).json({ error: err.message });
  }
});

// ================== IOT ROUTE ==================
const iotIngestRoute = require('./routes/iotIngest')(io);
app.use('/iot', iotIngestRoute);

// ================== HEALTH CHECK ==================
app.get('/', (req, res) => {
  res.send('AgroTrust Backend Running 🚀');
});

// ================== GAP FUNDING SCHEDULER ==================
setInterval(async () => {
  try {
    const now = new Date();
    const expiredGaps = await GapRequest.find({
      status: 'approved',
      layerDeadline: { $lt: now }
    });
    let processed = 0;
    for (const gap of expiredGaps) {
      if (gap.currentLayer === 1) {
        // Check eligibility for layer 2
        const eligibility = await creditScoreService.isEligibleForLayer2({
          farmerId: gap.farmerId,
          gapRequestId: gap._id
        });
        if (eligibility.eligible) {
          gap.currentLayer = 2;
          gap.layerDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
          await gap.save();
        } else {
          // Skip to layer 3
          gap.currentLayer = 3;
          gap.layerDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
          await gap.save();
        }
      } else if (gap.currentLayer === 2) {
        // Try buffer deployment
        try {
          await bufferFundService.deployBuffer({ gapRequestId: gap._id, amount: gap.amountRequested - gap.amountFilled });
        } catch (err) {
          // If buffer fails, wind down
          await gapPaymentService.triggerWindDown({ gapRequestId: gap._id, projectId: gap.campaignId });
        }
      }
      processed++;
    }
    if (processed > 0) {
      console.log(`[Scheduler] Processed ${processed} expired gap requests at ${now.toISOString()}`);
    }
  } catch (err) {
    console.error('[Scheduler Error]', err);
  }
}, 60 * 60 * 1000); // Every hour

// ================== ERROR HANDLER ==================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ================== SERVER ==================
const PORT = 5001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} — accessible on network`);
});

module.exports = { app, io };