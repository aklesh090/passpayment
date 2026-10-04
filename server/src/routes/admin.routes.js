const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const passController = require('../controllers/pass.controller');
const { verifyJWT, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(verifyJWT, requireAdmin);

// ── Dashboard / Users / Orders ──
router.get('/dashboard', adminController.getDashboard);
router.get('/orders', adminController.getAllOrders);
router.get('/users', adminController.getAllUsers);

// ── Tickets ──
router.get('/tickets', adminController.getAllTickets);
router.patch('/tickets/:id/cancel', adminController.cancelTicket);
router.get('/tickets/:id/entries', adminController.getTicketEntries);
router.post('/verify-ticket', adminController.verifyTicket);

// ── Event session (informational only) ──
router.get('/session', adminController.getEventSession);

// ── Pass Management (admin-only) ──
// GET  /api/admin/passes           → all passes including inactive
// POST /api/admin/passes           → create new pass
// PUT  /api/admin/passes/:id       → edit pass fields
// PATCH /api/admin/passes/:id/toggle → toggle isActive
router.get('/passes', passController.getAllPassesAdmin);
router.post('/passes', passController.createPass);
router.put('/passes/:id', passController.updatePass);
router.patch('/passes/:id/toggle', passController.togglePassActive);

// ── Reports ──
router.get('/reports/csv', adminController.downloadSalesReportCSV);

// ── Health check ──
router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Admin routes ready' });
});

module.exports = router;

