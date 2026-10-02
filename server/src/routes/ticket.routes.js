const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

// All ticket routes require authentication
router.get('/', verifyJWT, ticketController.getMyTickets);
router.get('/:id', verifyJWT, ticketController.getTicketById);
router.get('/:id/download', verifyJWT, ticketController.downloadTicketPDF);

module.exports = router;
