const crypto = require('crypto');

/**
 * Application-level error class.
 * Allows setting HTTP status codes on thrown errors.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Generate a unique order number.
 * Format: RR2-YYYYMMDD-XXXXXX (6 random hex chars)
 */
function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RR2-${y}${m}${d}-${rand}`;
}

/**
 * Generate a unique ticket ID.
 * Format: RR2-{PASS_CODE}-{SEQUENCE}
 *
 * @param {string} passSlug  - e.g., "vip-season-pass", "day-5-pass"
 * @param {number} sequence  - auto-incrementing counter from soldQuantity
 */
function generateTicketId(passSlug, sequence) {
  let code;
  if (passSlug.includes('vip')) {
    code = 'VIP';
  } else if (passSlug.includes('ga') || passSlug.includes('season')) {
    code = 'SEASON';
  } else {
    // Extract day number from slugs like "day-1-pass", "day-2-pass"
    const match = passSlug.match(/day-?(\d)/i);
    code = match ? `DAY${match[1]}` : passSlug.substring(0, 4).toUpperCase();
  }
  const seq = String(sequence).padStart(5, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `RR20-${code}-${seq}-${rand}`;
}

/**
 * Generate a cryptographically secure random QR token.
 * This token is embedded in QR codes and does NOT expose
 * any user data, order data, or payment details.
 *
 * @returns {string} 32-byte hex string (64 characters)
 */
function generateQRToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt which is backed by a CSPRNG.
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

module.exports = {
  AppError,
  generateOrderNumber,
  generateTicketId,
  generateQRToken,
  generateOTP,
};
