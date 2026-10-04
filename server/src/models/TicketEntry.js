const mongoose = require('mongoose');

/**
 * TicketEntry — per-day gate entry record
 *
 * One document is written for each successful gate admission.
 * The compound unique index { ticket, eventDay } prevents the same
 * ticket from being admitted twice on the same event day — even under
 * concurrent scan attempts (atomic findOneAndUpdate + unique constraint).
 *
 * This is ADDITIVE: existing Ticket documents are not modified.
 * Both daily and season passes use this same table.
 */
const ticketEntrySchema = new mongoose.Schema(
  {
    /** Reference to the parent Ticket document */
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },

    /** Readable ticket identifier, stored for quick lookup without join */
    ticketId: {
      type: String,
      required: true,
      index: true,
    },

    /** Event day number (1–9) */
    eventDay: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },

    /**
     * Calendar date (IST) of the event session.
     * Stored as a YYYY-MM-DD string for human readability in reports.
     * e.g. "2026-10-11" for Day 1
     */
    eventDate: {
      type: String,
      required: true,
    },

    /** Wall-clock time the QR was scanned */
    scannedAt: {
      type: Date,
      default: Date.now,
    },

    /** Admin/staff user who performed the scan */
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Which identifier was presented: 'qrToken' | 'ticketId' */
    identifierUsed: {
      type: String,
      enum: ['qrToken', 'ticketId'],
      default: 'qrToken',
    },
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRITICAL: Unique compound index prevents double-admission.
 *
 * A MongoDB unique index enforces this atomically — even if two devices
 * attempt to insert for the same (ticket, eventDay) simultaneously,
 * only the first will succeed. The second gets a duplicate key error (E11000).
 *
 * This is the primary race-condition guard.
 */
ticketEntrySchema.index(
  { ticket: 1, eventDay: 1 },
  { unique: true, name: 'unique_ticket_per_day' }
);

// Additional index for admin reporting: entries by day
ticketEntrySchema.index({ eventDay: 1, scannedAt: -1 });

const TicketEntry = mongoose.model('TicketEntry', ticketEntrySchema);

module.exports = TicketEntry;
