const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    passType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PassType',
      required: true,
    },
    passName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'Order must have at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },

    // ── Razorpay fields ──
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
    },

    // ── Payment lifecycle statuses ──
    paymentStatus: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'created',
    },
    orderStatus: {
      type: String,
      enum: ['created', 'confirmed', 'cancelled'],
      default: 'created',
    },

    // ── Idempotency ──
    // Prevents duplicate order creation from retried frontend requests
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Prevents duplicate ticket generation from concurrent verify + webhook
    ticketsGenerated: {
      type: Boolean,
      default: false,
    },

    // ── Stock rollback tracking ──
    // Prevents double-rollback on repeated failure webhooks
    stockRolledBack: {
      type: Boolean,
      default: false,
    },

    // Buyer info (captured at checkout)
    buyerName: {
      type: String,
      required: [true, 'Buyer name is required'],
      trim: true,
    },
    buyerEmail: {
      type: String,
      required: [true, 'Buyer email is required'],
      lowercase: true,
      trim: true,
    },
    buyerPhone: {
      type: String,
      required: [true, 'Buyer phone is required'],
      trim: true,
    },

    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
orderSchema.index({ user: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
