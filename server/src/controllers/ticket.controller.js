const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const { AppError } = require('../utils/helpers');
const { generateTicketPDF } = require('../services/pdf.service');

/**
 * GET /api/tickets
 * List current user's tickets.
 */
exports.getMyTickets = async (req, res, next) => {
  try {
    // Include qrCode for the owner — ownership is enforced by the user filter.
    // This avoids N+1 re-fetches on the MyPasses page.
    const tickets = await Ticket.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/:id
 * Get a single ticket with full details including QR code.
 * Accepts either `ticketId` (e.g. RR20-VIP-00001) or MongoDB `_id`.
 *
 * ── MANDATORY SECURITY CHECK ──
 * Only the owner of the ticket or an authorized admin can access it.
 */
exports.getTicketById = async (req, res, next) => {
  try {
    const param = req.params.id;
    let query;

    if (mongoose.Types.ObjectId.isValid(param)) {
      query = { _id: param };
    } else {
      query = { ticketId: param };
    }

    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // ── SECURITY: Ownership check ──
    if (!ticket.user.equals(req.user._id) && req.user.role !== 'admin') {
      throw new AppError('Unauthorized access to ticket', 403);
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tickets/:id/download
 * Download professional PDF pass for a ticket.
 * Accepts either `ticketId` (e.g. RR20-VIP-00001) or MongoDB `_id`.
 *
 * ── MANDATORY SECURITY CHECK ──
 * Only the owner of the ticket or an authorized admin can download it.
 */
exports.downloadTicketPDF = async (req, res, next) => {
  try {
    const param = req.params.id;
    let query;

    if (mongoose.Types.ObjectId.isValid(param)) {
      query = { _id: param };
    } else {
      query = { ticketId: param };
    }

    const ticket = await Ticket.findOne(query);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // ── SECURITY: Ownership check ──
    if (!ticket.user.equals(req.user._id) && req.user.role !== 'admin') {
      throw new AppError('Unauthorized access to ticket download', 403);
    }

    const pdfBuffer = await generateTicketPDF(ticket);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Pass-${ticket.ticketId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
