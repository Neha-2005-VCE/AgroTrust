/**
 * AgroTrust — Blockchain Bridge (interact.js)
 * =============================================
 * Person B imports ONLY from this file. Never touch ABI or ethers directly.
 *
 * Usage:
 *   const { createProjectOnChain, depositToChain, logMilestoneToChain, refundOnChain, getChainProject } = require("./interact");
 *
 * Required .env:
 *   POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
 *   PLATFORM_PRIVATE_KEY=your_deployer_private_key
 *   CONTRACT_ADDRESS=0x9F4697c01EF178f4C3AAC11EcBF98439A7a02eB9
 */

const { ethers } = require("ethers");
const ABI = require("./abi.json");
require("dotenv").config();

// ─── Provider + Wallet + Contract ──────────────────────

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);

// ─── Write functions (require gas) ─────────────────────

/**
 * Register a new agricultural project on-chain.
 * @param {number|string} projectId - Unique project identifier
 * @param {string} farmerAddress - Farmer's wallet address
 * @returns {string} Transaction hash
 */
async function createProjectOnChain(projectId, farmerAddress) {
  const tx = await contract.createProject(projectId, farmerAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Deposit funds into a project's escrow (investor action).
 * @param {number|string} projectId - Project to fund
 * @param {string} amountWei - Amount in wei (use ethers.parseEther)
 * @returns {string} Transaction hash
 */
async function depositToChain(projectId, amountWei) {
  const tx = await contract.depositFunds(projectId, { value: amountWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Release a milestone payment to the farmer.
 * Milestones must be sequential: 1 → 2 → 3 → 4
 * @param {number|string} projectId
 * @param {number} stageIndex - 1=Sowing(20%), 2=Growth(25%), 3=Harvest(30%), 4=Delivery(25%)
 * @returns {string} Transaction hash
 */
async function logMilestoneToChain(projectId, stageIndex) {
  const tx = await contract.releaseMilestone(projectId, stageIndex);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Mark project as failed and refund all investors proportionally.
 * @param {number|string} projectId
 * @returns {string} Transaction hash
 */
async function refundOnChain(projectId) {
  const tx = await contract.refund(projectId);
  const receipt = await tx.wait();
  return receipt.hash;
}

// ─── Read functions (no gas) ───────────────────────────

/**
 * Get project details from the contract.
 * @param {number|string} projectId
 * @returns {Object} { farmer, totalFunded, releasedAmount, currentMilestone, completed, failed }
 */
async function getChainProject(projectId) {
  const result = await contract.getProject(projectId);
  return {
    farmer: result[0],
    totalFunded: ethers.formatEther(result[1]),
    releasedAmount: ethers.formatEther(result[2]),
    currentMilestone: Number(result[3]),
    completed: result[4],
    failed: result[5],
  };
}

/**
 * Get how much a specific investor deposited into a project.
 * @param {number|string} projectId
 * @param {string} investorAddress
 * @returns {string} Amount in MATIC (formatted from wei)
 */
async function getInvestorShare(projectId, investorAddress) {
  const result = await contract.getInvestorShare(projectId, investorAddress);
  return ethers.formatEther(result);
}

module.exports = {
  createProjectOnChain,
  depositToChain,
  logMilestoneToChain,
  refundOnChain,
  getChainProject,
  getInvestorShare,
  // Export raw references for advanced use
  contract,
  provider,
  wallet,
};
