const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  dotenv.config({ path: path.join(__dirname, '..', 'env') });
}

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EXPERT_EMAIL = process.env.EXPERT_EMAIL;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function notifyExpert(farmId, photoUrl, uploadedAt = new Date()) {
  try {
    const mailOptions = {
      from: EMAIL_USER,
      to: EXPERT_EMAIL,
      subject: 'New Crop Photo Pending Verification',
      html: `<p>Farm ID: <b>${farmId}</b></p>
             <p>Photo URL: <a href="${photoUrl}">${photoUrl}</a></p>
             <p>Upload Timestamp: ${uploadedAt}</p>
             <p><a href="/api/expert/pending-verifications">Go to Expert Dashboard</a></p>`
    };
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log('Failed to send expert notification:', err.message);
  }
}

async function notifyFarmer(farmerEmail, verdict, remarks) {
  try {
    let body = `<p>Your crop photo has been <b>${verdict}</b>.</p>`;
    if (remarks) body += `<p>Expert remarks: ${remarks}</p>`;
    if (verdict === 'REJECTED') {
      body += '<p>Your photo was rejected. Please re-upload a new photo for verification.</p>';
    }
    const mailOptions = {
      from: EMAIL_USER,
      to: farmerEmail,
      subject: 'Your Crop Photo Verification Result',
      html: body
    };
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log('Failed to send farmer notification:', err.message);
  }
}

module.exports = {
  notifyExpert,
  notifyFarmer,
};
