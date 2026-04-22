
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');


// Load ABI
const abiPath = path.join(__dirname, 'abi.json');
let abi;
try {
  abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (err) {
  console.error('[ERROR] Failed to load ABI:', err);
  abi = [];
}

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function increment() {
  try {
    console.log('[BLOCKCHAIN] Calling inc()...');
    const tx = await contract.inc();
    console.log('[BLOCKCHAIN] Transaction sent:', tx.hash);
    await tx.wait();
    console.log('[SUCCESS] increment confirmed:', tx.hash);
    return tx.hash;
  } catch (err) {
    console.error('[ERROR] increment failed:', err);
    throw err;
  }
}

async function incrementBy(value) {
  try {
    console.log('[BLOCKCHAIN] Calling incBy(', value, ')...');
    const tx = await contract.incBy(value);
    console.log('[BLOCKCHAIN] Transaction sent:', tx.hash);
    await tx.wait();
    console.log('[SUCCESS] incrementBy confirmed:', tx.hash);
    return tx.hash;
  } catch (err) {
    console.error('[ERROR] incrementBy failed:', err);
    throw err;
  }
}

async function getValue() {
  try {
    console.log('[BLOCKCHAIN] Reading x()...');
    const value = await contract.x();
    console.log('[SUCCESS] getValue:', value.toString());
    return value;
  } catch (err) {
    console.error('[ERROR] getValue failed:', err);
    throw err;
  }
}

module.exports = {
  increment,
  incrementBy,
  getValue
};

async function getChainProject(projectId) {
  try {
    const data = await contract.getProject(projectId);
    console.log('getChainProject data:', data);
    return data;
  } catch (err) {
    console.error('Error in getChainProject:', err);
    throw err;
  }
}

module.exports = {
  createProjectOnChain,
  depositToChain,
  logMilestoneToChain,
  getChainProject
};
