// Script to update IoTReading documents with the correct project_id
// Usage: node updateIoTReadingsProjectId.js

const mongoose = require('mongoose');

const IoTReading = require('./models/IoTReading');
const Investment = require('./models/Investment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/YOUR_DB_NAME';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find IoTReadings missing project_id but having investment_id
  const readings = await IoTReading.find({
    $or: [ { project_id: { $exists: false } }, { project_id: null }, { project_id: '' } ],
    investment_id: { $exists: true, $ne: null, $ne: '' }
  });

  let updated = 0;
  for (const reading of readings) {
    // Find the investment and its project
    const investment = await Investment.findById(reading.investment_id);
    if (investment && investment.project) {
      reading.project_id = investment.project;
      await reading.save();
      updated++;
      console.log(`Updated IoTReading _id=${reading._id} with project_id=${investment.project}`);
    } else {
      console.log(`Could not find project for IoTReading _id=${reading._id}`);
    }
  }

  console.log(`Update complete. Total updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
