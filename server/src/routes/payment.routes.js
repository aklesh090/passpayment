const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

// POST /api/payments/verify — requires authentication
router.post('/verify', verifyJWT, paymentController.verifyPayment);

// NOTE: POST /api/payments/webhook is registered directly in app.js
// BEFORE the JSON body parser so that Razorpay signature verification
// receives the raw request body. It must NOT be re-registered here.

module.exports = router;

