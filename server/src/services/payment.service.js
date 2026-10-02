const { validatePaymentVerification, validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');
const env = require('../config/env');
const { getRazorpayInstance } = require('../config/razorpay');

/**
 * Create a Razorpay order.
 *
 * ── CRITICAL ──
 * Amount is calculated SERVER-SIDE from the database price.
 * The frontend NEVER determines the payable amount.
 *
 * @param {number} amount   - Amount in INR (e.g., 750)
 * @param {string} receipt  - Order number for reference
 * @returns {Promise<Object>} Razorpay order object
 */
async function createRazorpayOrder(amount, receipt) {
  const razorpay = getRazorpayInstance();

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency: 'INR',
    receipt,
    // payment_capture: 1 is the default — auto-capture on success
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (err) {
    // If using dummy/placeholder keys in dev or test environment, return a mock Razorpay order
    if (
      env.NODE_ENV !== 'production' ||
      env.RAZORPAY_KEY_ID.includes('xxxxxxxx') ||
      env.RAZORPAY_KEY_ID.includes('rangiloraas')
    ) {
      console.warn('[Payment Service] Razorpay API call failed in dev/test. Returning mock order.');
      return {
        id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }
    throw err;
  }
}

/**
 * Verify Razorpay payment signature using the official SDK utility.
 *
 * Uses `validatePaymentVerification` from razorpay/dist/utils/razorpay-utils
 * which performs HMAC-SHA256 verification of:
 *   razorpay_order_id|razorpay_payment_id  vs  razorpay_signature
 *
 * @param {string} razorpayOrderId   - order_xxxxx (from SERVER's DB, not frontend)
 * @param {string} razorpayPaymentId - pay_xxxxx
 * @param {string} razorpaySignature - Signature from Razorpay callback
 * @returns {boolean} Whether the signature is valid
 */
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  try {
    return validatePaymentVerification(
      {
        order_id: razorpayOrderId,
        payment_id: razorpayPaymentId,
      },
      razorpaySignature,
      env.RAZORPAY_KEY_SECRET
    );
  } catch (err) {
    // SDK throws SignatureVerificationError on mismatch
    console.error('[Payment] Signature verification failed:', err.message);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature using the official SDK utility.
 *
 * Uses `validateWebhookSignature` from razorpay/dist/utils/razorpay-utils
 * which performs HMAC-SHA256 verification of the raw request body.
 *
 * ── IMPORTANT ──
 * The request body MUST be the raw Buffer/string, NOT parsed JSON.
 *
 * @param {string|Buffer} body       - Raw request body
 * @param {string} webhookSignature  - X-Razorpay-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignatureSDK(body, webhookSignature) {
  try {
    const bodyStr = typeof body === 'string' ? body : body.toString();
    return validateWebhookSignature(
      bodyStr,
      webhookSignature,
      env.RAZORPAY_WEBHOOK_SECRET
    );
  } catch (err) {
    // SDK throws SignatureVerificationError on mismatch
    console.error('[Webhook] Signature verification failed:', err.message);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay API.
 * Used for server-side verification of payment status.
 *
 * @param {string} paymentId - pay_xxxxx
 * @returns {Promise<Object>} Razorpay payment entity
 */
async function fetchPaymentFromRazorpay(paymentId) {
  const razorpay = getRazorpayInstance();
  return razorpay.payments.fetch(paymentId);
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature: verifyWebhookSignatureSDK,
  fetchPaymentFromRazorpay,
};
