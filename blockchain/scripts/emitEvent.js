require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend/.env') });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const abiPath = path.join(__dirname, '../../backend/blockchain/abi.json');
const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = Array.isArray(abiJson) ? abiJson : abiJson.abi;

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

async function emitProjectCreated() {
  const farmer = wallet.address; // Use backend wallet as farmer for test
  const tx = await contract.createProject(1, farmer);
  await tx.wait();
  console.log('ProjectCreated event emitted.');
}

emitProjectCreated().catch(console.error);
