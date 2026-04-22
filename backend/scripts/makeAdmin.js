
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function makeAdmin(email) {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email: email },
    { $set: { role: 'admin' } },
    { new: true }
  );
  console.log('Updated user:', user);
  mongoose.disconnect();
}

// Replace with your email address
makeAdmin('admin@gmail.com');
