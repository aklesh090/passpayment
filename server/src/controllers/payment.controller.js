const Order = require('../models/Order');
const PassType = require('../models/PassType');
const Ticket = require('../models/Ticket');
const { AppError } = require('../utils/helpers');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../services/payment.service');
const { generateTicket } = require('../services/ticket.service');

// ────────────────────────────────────────────────────────────────
// Shared: idempotent ticket generation
// ────────────────────────────────────────────────────────────────

/**
 * Generate tickets for a paid order — IDEMPOTENT.
 *
 * Uses atomic findOneAndUpdate with { ticketsGenerated: false }
 * to ensure that even if verify + webhook fire concurrently,
 * tickets are created exactly once.
 *
 * @param {string} orderId - MongoDB _id of the order
 * @returns {Promise<Array>} Array of created ticket documents
 */
async function generateTicketsForOrder(orderId) {
  // ── Atomic flag: only proceed if tickets haven't been generated yet ──
  const order = await Order.findOneAndUpdate(
    { _id: orderId, ticketsGenerated: false },
    { $set: { ticketsGenerated: true } },
    { new: true }
  );

  // If null, tickets were already generated (by webhook or prior verify call)
  if (!order) {
    const existing = await Ticket.find({ order: orderId }).select('ticketId passName validDays holderName');
    return existing;
  }

  const tickets = [];

  for (const item of order.items) {
    const passType = await PassType.findById(item.passType);
    if (!passType) continue;

    for (let i = 0; i < item.quantity; i++) {
      const sequence = passType.soldQuantity - item.quantity + i + 1;
      const { ticketId, qrToken, qrCode } = await generateTicket(passType.slug, sequence);

      try {
        const ticket = await Ticket.create({
          ticketId,
          qrToken,
          order: order._id,
          passType: passType._id,
          user: order.user,
          holderName: order.buyerName,
          holderEmail: order.buyerEmail,
          holderPhone: order.buyerPhone,
          passName: passType.name,
          validDays: passType.applicableDays,
          qrCode,
          status: 'active',
        });
        tickets.push(ticket);
      } catch (err) {
        // If duplicate key error (ticket already exists), skip
        if (err.code === 11000) {
          console.warn(`[Tickets] Duplicate ticket skipped: ${ticketId}`);
          continue;
        }
        throw err;
      }
    }
  }

  return tickets;
}

// ────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// ────────────────────────────────────────────────────────────────

/**
 * Verify Razorpay payment signature and generate tickets.
 *
 * ── CRITICAL RULES ──
 * • The frontend NEVER determines payment success
 * • The server verifies the Razorpay HMAC signature using the SDK
 * • The order's razorpayOrderId from the DATABASE is used (not from frontend)
 * • Ticket generation is idempotent
 * • Repeated verification requests return existing tickets
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Missing Razorpay payment details', 400);
    }

    // ── Find order by Razorpay order ID (from our DB, not trusted from frontend) ──
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // ── Ensure this order belongs to the requesting user ──
    if (!order.user.equals(req.user._id)) {
      throw new AppError('Unauthorized', 403);
    }

    // ── Idempotency: if already paid, return existing tickets ──
    if (order.paymentStatus === 'paid') {
      const existingTickets = await Ticket.find({ order: order._id })
        .select('ticketId passName validDays holderName status');

      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: 'PAID',
          paymentStatus: order.paymentStatus,
          tickets: existingTickets,
        },
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
        },
        tickets: existingTickets.map((t) => ({
          ticketId: t.ticketId,
          passName: t.passName,
          validDays: t.validDays,
          holderName: t.holderName,
          status: t.status,
        })),
      });
    }

    // ── Reject if already failed/cancelled/refunded ──
    if (['failed', 'cancelled', 'refunded'].includes(order.paymentStatus)) {
      throw new AppError(`Cannot verify payment. Order status is: ${order.paymentStatus}`, 400);
    }

    // ── Verify HMAC signature using official Razorpay SDK ──
    // CRITICAL: Use the order's razorpayOrderId from DATABASE, not from the request
    const isValid = verifyPaymentSignature(
      order.razorpayOrderId, // FROM DATABASE — source of truth
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      // Signature mismatch — potential tampering
      order.paymentStatus = 'failed';
      await order.save();

      throw new AppError('Payment verification failed. Signature mismatch.', 400);
    }

    // ── Payment is verified. Mark as paid (atomic to prevent race conditions). ──
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: 'created', // Only transition from 'created' → 'paid'
      },
      {
        $set: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          paidAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      // Race condition: another process already updated this order
      // Fetch current state and return
      const currentOrder = await Order.findById(order._id);
      if (currentOrder.paymentStatus === 'paid') {
        const existingTickets = await Ticket.find({ order: order._id })
          .select('ticketId passName validDays holderName status');
        return res.json({
          success: true,
          message: 'Payment already verified (concurrent)',
          order: {
            _id: currentOrder._id,
            orderNumber: currentOrder.orderNumber,
            paymentStatus: currentOrder.paymentStatus,
            orderStatus: currentOrder.orderStatus,
          },
          tickets: existingTickets.map((t) => ({
            ticketId: t.ticketId,
            passName: t.passName,
            validDays: t.validDays,
            holderName: t.holderName,
            status: t.status,
          })),
        });
      }
      throw new AppError('Order state changed unexpectedly', 409);
    }

    // ── Generate tickets ONLY after verified payment — idempotent ──
    const tickets = await generateTicketsForOrder(updatedOrder._id);

    res.json({
      success: true,
      message: 'Payment verified and tickets generated',
      data: {
        id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: 'PAID',
        paymentStatus: updatedOrder.paymentStatus,
        tickets: tickets,
      },
      order: {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.orderStatus,
      },
      tickets: tickets.map((t) => ({
        ticketId: t.ticketId,
        passName: t.passName,
        validDays: t.validDays,
        holderName: t.holderName,
        status: t.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// ────────────────────────────────────────────────────────────────

/**
 * Razorpay webhook handler — the ultimate source of truth.
 *
 * ── IDEMPOTENCY ──
 * • Uses atomic findOneAndUpdate with status guards
 * • ticketsGenerated flag prevents duplicate ticket creation
 * • stockRolledBack flag prevents double stock rollback
 * • Duplicate key errors on tickets are caught and skipped
 * • Always returns 200 to Razorpay (even on internal errors)
 *
 * ── IMPORTANT ──
 * This route receives the RAW body (not parsed JSON).
 * Express must use express.raw() for this route.
 *
 * ── HANDLED EVENTS ──
 * • payment.captured  → mark paid, generate tickets
 * • payment.failed    → mark failed, rollback stock
 * • payment.authorized → log (auto-capture handles the rest)
 * • order.paid        → fallback for payment.captured
 * • refund.created    → mark refunded, cancel tickets
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      console.warn('[Webhook] Missing x-razorpay-signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // ── Verify webhook signature using official Razorpay SDK ──
    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      console.warn('[Webhook] Invalid signature — rejecting');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString());
    const eventType = event.event;

    console.log(`[Webhook] Received event: ${eventType}`);

    // ── payment.captured ──
    if (eventType === 'payment.captured') {
      await handlePaymentCaptured(event);
    }

    // ── payment.failed ──
    if (eventType === 'payment.failed') {
      await handlePaymentFailed(event);
    }

    // ── order.paid (fallback) ──
    if (eventType === 'order.paid') {
      await handleOrderPaid(event);
    }

    // ── refund.created ──
    if (eventType === 'refund.created') {
      await handleRefundCreated(event);
    }

    // ── payment.authorized (informational) ──
    if (eventType === 'payment.authorized') {
      const payment = event.payload.payment.entity;
      console.log(`[Webhook] Payment authorized: ${payment.id} for order: ${payment.order_id}`);
    }

    // Always respond 200 to acknowledge the webhook
    res.status(200).json({ status: 'ok', received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    // Still respond 200 to prevent Razorpay retries on our errors
    res.status(200).json({ status: 'error' });
  }
};

// ────────────────────────────────────────────────────────────────
// Webhook event handlers
// ────────────────────────────────────────────────────────────────

/**
 * Handle payment.captured event.
 * Atomically transitions order from 'created' → 'paid'.
 * Generates tickets idempotently.
 */
async function handlePaymentCaptured(event) {
  const payment = event.payload.payment.entity;
  const razorpayOrderId = payment.order_id;

  // ── Atomic update: only if not already paid ──
  const order = await Order.findOneAndUpdate(
    {
      razorpayOrderId,
      paymentStatus: { $in: ['created'] }, // Only from 'created'
    },
    {
      $set: {
        razorpayPaymentId: payment.id,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        paidAt: new Date(),
      },
    },
    { new: true }
  );

  if (!order) {
    // Either order not found, or already processed
    const existing = await Order.findOne({ razorpayOrderId });
    if (!existing) {
      console.warn(`[Webhook] Order not found for Razorpay order: ${razorpayOrderId}`);
    } else {
      console.log(`[Webhook] Order ${existing.orderNumber} already in status: ${existing.paymentStatus} — skipping`);
    }
    return;
  }

  // ── Generate tickets (idempotent) ──
  await generateTicketsForOrder(order._id);

  console.log(`[Webhook] ✅ Payment captured for order: ${order.orderNumber}`);
}

/**
 * Handle payment.failed event.
 * Atomically transitions order from 'created' → 'failed'.
 * Rolls back stock exactly once using stockRolledBack flag.
 */
async function handlePaymentFailed(event) {
  const payment = event.payload.payment.entity;
  const razorpayOrderId = payment.order_id;

  // ── Atomic update: only transition from 'created' → 'failed' ──
  const order = await Order.findOneAndUpdate(
    {
      razorpayOrderId,
      paymentStatus: 'created',
      stockRolledBack: false,
    },
    {
      $set: {
        paymentStatus: 'failed',
        stockRolledBack: true,
      },
    },
    { new: true }
  );

  if (!order) {
    console.log(`[Webhook] Payment failed event — order already processed or not found: ${razorpayOrderId}`);
    return;
  }

  // ── Rollback stock ──
  for (const item of order.items) {
    await PassType.findByIdAndUpdate(item.passType, {
      $inc: { soldQuantity: -item.quantity },
    });
  }

  console.log(`[Webhook] ❌ Payment failed for order: ${order.orderNumber} — stock rolled back`);
}

/**
 * Handle order.paid event (fallback for payment.captured).
 * Same logic as handlePaymentCaptured but extracts payment differently.
 */
async function handleOrderPaid(event) {
  const orderEntity = event.payload.order.entity;
  const razorpayOrderId = orderEntity.id;
  const paymentEntities = event.payload.payment ? event.payload.payment.items : [];

  const order = await Order.findOneAndUpdate(
    {
      razorpayOrderId,
      paymentStatus: { $in: ['created'] },
    },
    {
      $set: {
        razorpayPaymentId: paymentEntities.length > 0 ? paymentEntities[0].id : undefined,
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        paidAt: new Date(),
      },
    },
    { new: true }
  );

  if (!order) {
    console.log(`[Webhook] order.paid — already processed or not found: ${razorpayOrderId}`);
    return;
  }

  await generateTicketsForOrder(order._id);
  console.log(`[Webhook] ✅ Order paid (via order.paid event): ${order.orderNumber}`);
}

/**
 * Handle refund.created event.
 * Marks order as refunded and cancels all tickets.
 */
async function handleRefundCreated(event) {
  const refund = event.payload.refund.entity;
  const paymentId = refund.payment_id;

  const order = await Order.findOneAndUpdate(
    {
      razorpayPaymentId: paymentId,
      paymentStatus: 'paid',
    },
    {
      $set: {
        paymentStatus: 'refunded',
        orderStatus: 'cancelled',
      },
    },
    { new: true }
  );

  if (!order) {
    console.log(`[Webhook] Refund event — order not found or not in paid status: ${paymentId}`);
    return;
  }

  // Cancel all tickets for this order
  await Ticket.updateMany(
    { order: order._id, status: 'active' },
    { $set: { status: 'cancelled' } }
  );

  // Rollback stock
  if (!order.stockRolledBack) {
    for (const item of order.items) {
      await PassType.findByIdAndUpdate(item.passType, {
        $inc: { soldQuantity: -item.quantity },
      });
    }
    await Order.findByIdAndUpdate(order._id, { $set: { stockRolledBack: true } });
  }

  console.log(`[Webhook] 💸 Refund processed for order: ${order.orderNumber}`);
}
