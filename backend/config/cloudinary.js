const cloudinary = require('cloudinary').v2;
const path = require('path');
const dotenv = require('dotenv');

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  dotenv.config({ path: path.join(__dirname, '..', 'env') });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
