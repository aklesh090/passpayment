const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

/**
 * Get or create the SMTP transporter.
 * Used ONLY for forgot-password OTP emails.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    console.warn('⚠️  SMTP not configured. Email sending will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Send a forgot-password OTP email.
 *
 * @param {string} toEmail - Recipient email
 * @param {string} otp     - 6-digit OTP
 * @param {string} name    - Recipient name
 */
async function sendPasswordResetOTP(toEmail, otp, name) {
  const transport = getTransporter();

  if (!transport) {
    console.warn(`[Email] Would send OTP ${otp} to ${toEmail} — SMTP not configured`);
    return false;
  }

  const mailOptions = {
    from: `"Rangilo Raas" <${env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Password Reset OTP — Rangilo Raas',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #e53e3e; margin-bottom: 8px;">🎪 Rangilo Raas</h2>
        <p>Hi ${name || 'there'},</p>
        <p>You requested a password reset. Use the OTP below to reset your password:</p>
        <div style="background: #f7fafc; border: 2px solid #e53e3e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #e53e3e;">${otp}</span>
        </div>
        <p style="color: #718096; font-size: 14px;">This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #718096; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} Rangilo Raas. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transport.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

module.exports = {
  sendPasswordResetOTP,
};
