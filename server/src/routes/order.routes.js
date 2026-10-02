const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

// All order routes require authentication
router.post('/create', verifyJWT, orderController.createOrder);
router.post('/', verifyJWT, orderController.createOrder); // Alias
router.get('/', verifyJWT, orderController.getMyOrders);
router.get('/:id', verifyJWT, orderController.getOrderById);

// Legacy verify-payment endpoint (delegates to payment controller)
router.post('/:id/verify-payment', verifyJWT, paymentController.verifyPayment);

module.exports = router;
