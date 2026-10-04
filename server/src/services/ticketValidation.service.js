/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   Rangilo Raas 2026 — Ticket Validation Service          ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * SINGLE authoritative service for ticket gate validation.
 *
 * Handles:
 *  - Dual identifier lookup: qrToken OR ticketId
 *  - Payment status check
 *  - Cancellation check
 *  - Event session resolution (server-determined, never from frontend)
 *  - Daily pass: must match today's event day exactly
 *  - Season pass: valid on any of its listed days, once per day
 *  - Atomic entry recording via TicketEntry + unique index (race-condition safe)
 *  - Clear machine-readable result codes
 *
 * The frontend NEVER sends the event day — this service reads it from
 * the authoritative eventSession.service.
 *
 * @module ticketValidation.service
 */

'use strict';

const Ticket = require('../models/Ticket');
const TicketEntry = require('../models/TicketEntry');
const { getCurrentEventSession } = require('./eventSession.service');

// ─────────────────────────────────────────────────────────────────────────────
// Result Codes (machine-readable)
// ─────────────────────────────────────────────────────────────────────────────

const RESULT = {
  VALID_PASS:            'VALID_PASS',
  ALREADY_USED_TODAY:    'ALREADY_USED_TODAY',
  PASS_NOT_VALID_TODAY:  'PASS_NOT_VALID_TODAY',
  EVENT_NOT_ACTIVE:      'EVENT_NOT_ACTIVE',
  TICKET_NOT_FOUND:      'TICKET_NOT_FOUND',
  CANCELLED_PASS:        'CANCELLED_PASS',
  PAYMENT_NOT_VERIFIED:  'PAYMENT_NOT_VERIFIED',
};

// ─────────────────────────────────────────────────────────────────────────────
// IST date string helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the IST calendar date string for the START of a session.
 * e.g. Day 1 session starts Oct 11 → "2026-10-11"
 * We use sessionStart's date, not the current wall-clock midnight.
 *
 * @param {Date} sessionStart
 * @returns {string} YYYY-MM-DD in IST
 */
function getISTDateString(sessionStart) {
  const IST_OFFSET_MS = 5 * 60 * 60 * 1000 + 30 * 60 * 1000;
  const istMs = sessionStart.getTime() + IST_OFFSET_MS;
  const d = new Date(istMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Validation Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a ticket for gate entry and atomically record admission.
 *
 * @param {Object} params
 * @param {string} params.identifier    - scanned qrToken OR typed ticketId
 * @param {mongoose.Types.ObjectId} params.scannedBy - admin/staff user _id
 * @param {number} [params.nowMs]       - Optional UTC ms override (unit testing ONLY)
 *
 * @returns {Promise<{
 *   valid: boolean,
 *   result: string,               // one of RESULT.*
 *   message: string,              // human-readable
 *   eventDay: number|null,
 *   ticket?: {
 *     ticketId, passName, holderName, validDays, status
 *   }
 * }>}
 */
async function validateTicketForEntry({ identifier, scannedBy, nowMs }) {
  // ── 1. Resolve current event session (server-side, never from frontend) ──
  const session = getCurrentEventSession(nowMs);

  if (!session.active) {
    return {
      valid: false,
      result: RESULT.EVENT_NOT_ACTIVE,
      message: 'No event session is currently active. Admission is only allowed during event hours (6:30 PM – 1:00 AM IST).',
      eventDay: null,
    };
  }

  const { eventDay, sessionStart } = session;

  // ── 2. Lookup ticket — dual identifier: qrToken OR ticketId ──
  const ticket = await Ticket.findOne({
    $or: [
      { qrToken: identifier },
      { ticketId: identifier.toUpperCase() },
    ],
  }).populate('order', 'paymentStatus orderStatus');

  if (!ticket) {
    return {
      valid: false,
      result: RESULT.TICKET_NOT_FOUND,
      message: `No ticket found matching: ${identifier}`,
      eventDay,
    };
  }

  // Determine which identifier was used (for audit log)
  const identifierUsed = ticket.qrToken === identifier ? 'qrToken' : 'ticketId';

  // ── 3. Payment status check ──
  if (!ticket.order || ticket.order.paymentStatus !== 'paid') {
    const status = ticket.order?.paymentStatus || 'unknown';
    return {
      valid: false,
      result: RESULT.PAYMENT_NOT_VERIFIED,
      message: `Payment not verified. Order status: ${status}`,
      eventDay,
      ticket: _safeTicketInfo(ticket),
    };
  }

  // ── 4. Cancellation check ──
  if (ticket.status === 'cancelled') {
    return {
      valid: false,
      result: RESULT.CANCELLED_PASS,
      message: 'This ticket has been cancelled.',
      eventDay,
      ticket: _safeTicketInfo(ticket),
    };
  }

  // ── 5. Valid-day check — does this ticket cover today's event day? ──
  if (!ticket.validDays.includes(eventDay)) {
    return {
      valid: false,
      result: RESULT.PASS_NOT_VALID_TODAY,
      message: `This pass is not valid for Day ${eventDay}. Valid days: ${ticket.validDays.join(', ')}`,
      eventDay,
      ticket: _safeTicketInfo(ticket),
    };
  }

  // ── 6. Duplicate entry check + atomic write ──
  //
  // We use MongoDB's unique index { ticket, eventDay } to atomically prevent
  // double-admission. Approach:
  //   • Attempt to INSERT a TicketEntry for (ticket._id, eventDay)
  //   • If it succeeds → this is the first scan today → VALID
  //   • If it fails with E11000 (duplicate key) → already admitted → ALREADY_USED_TODAY
  //
  // This is race-condition safe: even with two simultaneous scans,
  // only one INSERT wins; the other gets E11000.

  const eventDate = getISTDateString(sessionStart);

  try {
    await TicketEntry.create({
      ticket: ticket._id,
      ticketId: ticket.ticketId,
      eventDay,
      eventDate,
      scannedBy,
      identifierUsed,
      scannedAt: nowMs ? new Date(nowMs) : new Date(),
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — this ticket was already admitted today
      return {
        valid: false,
        result: RESULT.ALREADY_USED_TODAY,
        message: `This ticket was already admitted for Day ${eventDay} today.`,
        eventDay,
        ticket: _safeTicketInfo(ticket),
      };
    }
    // Unexpected DB error — propagate
    throw err;
  }

  // ── 7. Update legacy checkIns array (backward compat with existing schema) ──
  //
  // We still write to the Ticket.checkIns array so the existing admin
  // Tickets page shows check-in counts correctly.
  // We do NOT use checkIns for admission decisions (TicketEntry handles that).
  //
  // NOTE: We do NOT flip status to 'used' for season passes.
  // Only flip to 'used' if this was the LAST valid day for the pass
  // (i.e., all validDays have now been consumed).

  try {
    const alreadyInCheckIns = ticket.checkIns.some((c) => c.day === eventDay);
    if (!alreadyInCheckIns) {
      await Ticket.findByIdAndUpdate(ticket._id, {
        $push: {
          checkIns: {
            day: eventDay,
            checkedInAt: new Date(),
            checkedInBy: scannedBy,
          },
        },
      });
    }

    // Count how many distinct days have now been used
    const totalEntries = await TicketEntry.countDocuments({ ticket: ticket._id });
    const totalValidDays = ticket.validDays.length;

    // Only mark 'used' when ALL valid days are consumed
    if (totalEntries >= totalValidDays && ticket.status === 'active') {
      await Ticket.findByIdAndUpdate(ticket._id, { $set: { status: 'used' } });
    }
  } catch (_updateErr) {
    // Non-critical: TicketEntry was already written (admission recorded).
    // Log but don't fail the request.
    console.error('[TicketValidation] Failed to update Ticket.checkIns:', _updateErr.message);
  }

  // ── 8. Admission granted ──
  return {
    valid: true,
    result: RESULT.VALID_PASS,
    message: `Admitted for Day ${eventDay}`,
    eventDay,
    eventDate,
    ticket: _safeTicketInfo(ticket),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safe ticket info for response (no secrets)
// ─────────────────────────────────────────────────────────────────────────────

function _safeTicketInfo(ticket) {
  return {
    ticketId:    ticket.ticketId,
    passName:    ticket.passName,
    holderName:  ticket.holderName,
    validDays:   ticket.validDays,
    status:      ticket.status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  validateTicketForEntry,
  RESULT,
};
