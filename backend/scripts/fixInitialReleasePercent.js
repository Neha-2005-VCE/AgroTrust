const mongoose = require('mongoose');
const Agreement = require('../models/Agreement');

async function main() {
  await mongoose.connect('mongodb+srv://neha:neha21@cluster0.fx5bxc2.mongodb.net/agrotrust'); // Update with your DB name

  const result = await Agreement.updateMany(
    { $or: [{ initialReleasePercent: { $exists: false } }, { initialReleasePercent: 0 }] },
    { $set: { initialReleasePercent: 25 } }
  );

  console.log('Updated agreements:', result.modifiedCount);
  await mongoose.disconnect();
}

main();
