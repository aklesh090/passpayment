const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,

  // Frontend
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

/**
 * Validate that required environment variables are set.
 * In production, fail fast. In development, warn.
 */
function validateEnv() {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`⚠️  WARNING: ${message}`);
    }
  }

  // In production, refuse to start with placeholder / insecure default secrets
  if (env.NODE_ENV === 'production') {
    const PLACEHOLDER_PATTERNS = ['CHANGE_ME', 'xxxxxxxx', 'xxxxxxxxxxxx', 'rangiloraas', 'placeholder'];
    const insecureFields = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
    for (const field of insecureFields) {
      if (env[field]) {
        const val = String(env[field]).toLowerCase();
        if (PLACEHOLDER_PATTERNS.some((p) => val.includes(p.toLowerCase()))) {
          throw new Error(
            `SECURITY ERROR: ${field} contains a placeholder value. ` +
            `Generate a real secret before deploying to production. ` +
            `Run: openssl rand -hex 64`
          );
        }
      }
    }
    // Enforce minimum entropy on JWT secrets
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }
    if (env.JWT_REFRESH_SECRET && env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production.');
    }
  }
}

validateEnv();

module.exports = env;
