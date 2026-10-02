const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Razorpay webhook — receives raw body (configured in app.js)
router.post('/razorpay', webhookController.handleWebhook);

module.exports = router;
