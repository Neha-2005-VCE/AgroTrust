require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const abiPath = path.join(__dirname, '../blockchain/abi.json');
let abi;
try {
  abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
} catch (err) {
  console.error('[ERROR] Failed to load ABI:', err);
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

function printEvent(event, eventNameOverride = undefined) {
  // ethers v6: eventNameOverride is used for live events, event.event for past events
  const name = eventNameOverride || event.event || 'undefined';
  const block = event.blockNumber !== undefined ? event.blockNumber : event.blockNumber;
  const txHash = event.transactionHash !== undefined ? event.transactionHash : event.transactionHash;
  console.log('[EVENT] Block:', block);
  console.log('[EVENT] Tx Hash:', txHash);
  console.log('[EVENT] Name:', name);
  console.log('[EVENT] Args:', event.args);
  console.log('-----------------------------');
}

async function fetchPastEvents() {
  try {
    const eventNames = contract.interface.fragments.filter(f => f.type === 'event').map(f => f.name);
    for (const eventName of eventNames) {
      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, 0, 'latest');
      for (const event of events) {
        printEvent(event, eventName);
      }
    }
  } catch (err) {
    console.error('[ERROR] Fetching past events:', err);
  }
}

function listenToEvents() {
  const eventNames = contract.interface.fragments.filter(f => f.type === 'event').map(f => f.name);
  for (const eventName of eventNames) {
    contract.on(eventName, (...args) => {
      // ethers v6: event args are positional, event object is last
      const event = args[args.length - 1];
      printEvent(event, eventName);
    });
  }
  console.log('[EVENT] Listening for new events...');
}

(async () => {
  await fetchPastEvents();
  listenToEvents();
})();
