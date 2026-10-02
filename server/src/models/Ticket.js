const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 9,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    passType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassType',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Secure QR token ──
    // Cryptographically random token used in QR codes.
    // Does NOT expose user ID, order ID, or any sensitive data.
    qrToken: {
      type: String,
      unique: true,
      required: true,
    },

    // Holder info
    holderName: {
      type: String,
      required: [true, 'Holder name is required'],
      trim: true,
    },
    holderEmail: {
      type: String,
      required: [true, 'Holder email is required'],
      lowercase: true,
      trim: true,
    },
    holderPhone: {
      type: String,
      trim: true,
    },

    // Validity
    passName: {
      type: String,
      required: true,
    },
    validDays: {
      type: [Number],
      required: true,
    },

    // Check-in tracking
    checkIns: {
      type: [checkInSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ['active', 'used', 'cancelled', 'expired'],
      default: 'active',
    },

    // QR code data (base64 encoded image / data URL)
    qrCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
ticketSchema.index({ order: 1 });
ticketSchema.index({ user: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
