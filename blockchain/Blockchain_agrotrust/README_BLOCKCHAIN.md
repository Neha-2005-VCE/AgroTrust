# AgroTrust Blockchain — Handoff Documentation

This directory contains the core blockchain infrastructure for the AgroTrust project. It has been deployed to the **Polygon Amoy** testnet and verified.

## 1. Deployment Details

- **Contract Address:** `0x9F4697c01EF178f4C3AAC11EcBF98439A7a02eB9`
- **Network:** Polygon Amoy (Chain ID: 80002)
- **Explorer:** [Amoy PolygonScan](https://amoy.polygonscan.com/address/0x9F4697c01EF178f4C3AAC11EcBF98439A7a02eB9#code)

## 2. Setup for Person B (Backend Developer)

To integrate the blockchain layer with the Node.js backend:

1. **Install Dependencies:**
   In the root of the project or inside `blockchain/`, ensure you have:
   ```bash
   npm install ethers dotenv
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root of your backend project (refer to `blockchain/.env.backend.example`):
   ```env
   POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
   PLATFORM_PRIVATE_KEY=your_backend_wallet_private_key
   CONTRACT_ADDRESS=0x9F4697c01EF178f4C3AAC11EcBF98439A7a02eB9
   ```

3. **Import the Bridge:**
   Copy `blockchain/interact.js` and `blockchain/abi.json` into your backend folder and import the functions:
   ```javascript
   const { 
     createProjectOnChain, 
     depositToChain, 
     logMilestoneToChain, 
     getChainProject 
   } = require("./interact");
   ```

## 3. Demo Tools

- **Audit Trail:** Run `node scripts/readEvents.js` to see a real-time list of all on-chain events (deposits, releases, refunds).
- **Tests:** Run `npx hardhat test` to verify the logic on a local Hardhat network.

## 4. Shared Constants
- Refer to `constants/thresholds.json` for the sensor boundaries that the smart contract and simulator respect.
