// Do not load dotenv here; it should be loaded once in server.js
const { ethers } = require("ethers");
const abi = require("./abi.json");

// Provider & Wallet
// Validate private key and config
function getWalletAndContract() {
  const rpc = process.env.POLYGON_RPC_URL;
  const pk = process.env.PLATFORM_PRIVATE_KEY;
  const address = process.env.CONTRACT_ADDRESS;
  if (!rpc || !pk || !address) {
    throw new Error("[BLOCKCHAIN] Missing RPC, private key, or contract address in environment variables.");
  }
  if (typeof pk !== 'string' || !pk.startsWith('0x') || pk.length !== 66) {
    throw new Error(`[BLOCKCHAIN] Invalid private key format/length (length: ${pk ? pk.length : 'undefined'})`);
  }
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(address, abi, wallet);
  return contract;
}


// Create a new project
async function createProjectOnChain(projectId, farmerAddress) {
  try {
    const contract = getWalletAndContract();
    const tx = await contract.createProject(projectId, farmerAddress);
    await tx.wait();
    return tx.hash;
  } catch (err) {
    console.error("[ERROR createProject]", err);
    throw err;
  }
}

// Deposit funds into a project (msg.value required)
async function depositToChain(projectId, amountEth) {
  try {
    const contract = getWalletAndContract();
    const tx = await contract.depositFunds(projectId, { value: ethers.parseEther(amountEth.toString()) });
    await tx.wait();
    return tx.hash;
  } catch (err) {
    console.error("[ERROR depositFunds]", err);
    throw err;
  }
}

// Release milestone
async function logMilestoneToChain(projectId, stage) {
  try {
    const contract = getWalletAndContract();
    const tx = await contract.releaseMilestone(projectId, stage);
    await tx.wait();
    return tx.hash;
  } catch (err) {
    console.error("[ERROR releaseMilestone]", err);
    throw err;
  }
}

// Refund project
async function refundOnChain(projectId) {
  try {
    const contract = getWalletAndContract();
    const tx = await contract.refund(projectId);
    await tx.wait();
    return tx.hash;
  } catch (err) {
    console.error("[ERROR refund]", err);
    throw err;
  }
}

// Recursively convert BigInt values to strings
function bigIntToString(obj) {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(bigIntToString);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) out[k] = bigIntToString(obj[k]);
    return out;
  }
  return obj;
}

// Get project details
async function getChainProject(projectId) {
  try {
    const contract = getWalletAndContract();
    const data = await contract.getProject(projectId);
    return bigIntToString(data);
  } catch (err) {
    console.error("[ERROR getProject]", err);
    throw err;
  }
}

module.exports = {
  createProjectOnChain,
  depositToChain,
  logMilestoneToChain,
  refundOnChain,
  getChainProject
};