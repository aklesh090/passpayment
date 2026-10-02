const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyJWT, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(verifyJWT, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/orders', adminController.getAllOrders);
router.get('/users', adminController.getAllUsers);
router.get('/tickets', adminController.getAllTickets);
router.patch('/tickets/:id/cancel', adminController.cancelTicket);
router.post('/verify-ticket', adminController.verifyTicket);

// Health check
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Admin routes ready' });
});

module.exports = router;
