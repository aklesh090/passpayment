const Razorpay = require('razorpay');
const env = require('./env');

let razorpayInstance = null;

/**
 * Returns a singleton Razorpay instance.
 * Throws if credentials are not configured.
 */
const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      'Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env'
    );
  }

  razorpayInstance = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });

  return razorpayInstance;
};

module.exports = { getRazorpayInstance };
