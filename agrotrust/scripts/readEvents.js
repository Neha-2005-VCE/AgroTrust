require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = '0x9F4697c01EF178f4C3AAC11EcBF98439A7a02eB9';
const RPC_URL = process.env.POLYGON_RPC_URL;
const abiPath = path.join(__dirname, '../blockchain/abi.json');

let abi;
try {
  abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (err) {
  console.error('Failed to load ABI:', err);
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

async function printEvent(event) {
  console.log('--- Event ---');
  console.log('Block:', event.blockNumber);
  console.log('Tx Hash:', event.transactionHash);
  console.log('Event:', event.event);
  console.log('Args:', event.args);
  console.log('--------------');
}

async function queryPastEvents() {
  try {
    const eventNames = contract.interface.fragments
      .filter(f => f.type === 'event')
      .map(f => f.name);
    for (const eventName of eventNames) {
      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, 0, 'latest');
      for (const event of events) {
        await printEvent(event);
      }
    }
  } catch (err) {
    console.error('Error querying past events:', err);
  }
}

function listenToEvents() {
  contract.on('*', async (...args) => {
    const event = args[args.length - 1];
    await printEvent(event);
  });
  console.log('Listening for new events...');
}

(async () => {
  await queryPastEvents();
  listenToEvents();
})();
