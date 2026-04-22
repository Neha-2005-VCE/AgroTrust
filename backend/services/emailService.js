const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"AgroTrust" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return info;
  } catch (err) {
    console.error('Email send error:', err);
    return null;
  }
}

function investmentConfirmEmail({ investorName, amount, projectTitle }) {
  return `
    <div style="font-family:sans-serif;padding:20px;">
      <h2>Investment Confirmation</h2>
      <p>Dear ${investorName},</p>
      <p>Your investment of <b>Rs ${amount}</b> has been locked in escrow for project <b>${projectTitle}</b>.</p>
      <p>Thank you for supporting sustainable agriculture!</p>
      <hr>
      <small>AgroTrust Team</small>
    </div>
  `;
}

function milestoneReleasedEmail({ farmerName, amount, milestoneLabel }) {
  return `
    <div style="font-family:sans-serif;padding:20px;">
      <h2>Milestone Payment Released</h2>
      <p>Dear ${farmerName},</p>
      <p>Congratulations! <b>Rs ${amount}</b> has been released for milestone: <b>${milestoneLabel}</b>.</p>
      <p>Keep up the great work!</p>
      <hr>
      <small>AgroTrust Team</small>
    </div>
  `;
}

module.exports = { sendEmail, investmentConfirmEmail, milestoneReleasedEmail };
