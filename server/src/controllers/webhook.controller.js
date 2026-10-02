/**
 * Legacy webhook controller.
 * Delegates to the payment controller for consistency.
 *
 * The canonical webhook endpoint is POST /api/payments/webhook
 * This legacy endpoint at POST /api/webhooks/razorpay is kept
 * for backward compatibility with any existing Razorpay dashboard config.
 */
const { handleWebhook } = require('./payment.controller');

exports.handleWebhook = handleWebhook;
