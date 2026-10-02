const Order = require('../models/Order');
const PassType = require('../models/PassType');
const env = require('../config/env');
const { AppError, generateOrderNumber } = require('../utils/helpers');
const { createRazorpayOrder } = require('../services/payment.service');

/**
 * POST /api/orders/create
 * Create a new order and initiate Razorpay payment.
 *
 * ── FLOW ──
 * 1. Frontend sends pass ID + quantity (+ buyer info)
 * 2. Backend retrieves pass from MongoDB
 * 3. Backend validates pass is active
 * 4. Backend retrieves current price from DB
 * 5. Backend calculates total (NEVER trust frontend amount)
 * 6. Backend creates Razorpay order
 * 7. Save local order
 * 8. Return checkout info (including ONLY the public key)
 *
 * ── CRITICAL RULES ──
 * • Price comes from DATABASE, never from frontend
 * • Amount is calculated SERVER-SIDE
 * • Only RAZORPAY_KEY_ID (public key) is returned, NEVER the secret
 * • Idempotency key prevents duplicate orders from retried requests
 */
exports.createOrder = async (req, res, next) => {
  try {
    let { items, passId, passTypeId, quantity, buyerName, buyerEmail, buyerPhone, idempotencyKey } = req.body;

    // Normalize single passId/passTypeId + quantity into items array if items is not provided
    if (!items || !Array.isArray(items) || items.length === 0) {
      const targetPassId = passId || passTypeId;
      if (targetPassId && quantity) {
        items = [{ passTypeId: targetPassId, quantity: Number(quantity) }];
      }
    }

    // Default buyer info from authenticated user if omitted
    buyerName = buyerName || req.user?.name || 'Customer';
    buyerEmail = buyerEmail || req.user?.email || 'customer@example.com';
    buyerPhone = buyerPhone || req.user?.phone || '9876543210';

    // ── Input validation ──
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Order must have at least one item', 400);
    }

    // ── Idempotency check ──
    // If the frontend sends the same idempotencyKey twice, return the existing order
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already exists (idempotent)',
          order: {
            _id: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            totalAmount: existingOrder.totalAmount,
            items: existingOrder.items,
            paymentStatus: existingOrder.paymentStatus,
          },
          razorpayOrder: {
            id: existingOrder.razorpayOrderId,
            amount: Math.round(existingOrder.totalAmount * 100),
            currency: existingOrder.currency,
          },
          razorpayKeyId: env.RAZORPAY_KEY_ID, // PUBLIC key only
        });
      }
    }

    // ── Build order items — price comes from DB, NEVER from frontend ──
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { passTypeId, quantity } = item;

      if (!passTypeId || !quantity || quantity < 1) {
        throw new AppError('Each item must have a valid passTypeId and quantity >= 1', 400);
      }

      // Enforce reasonable max quantity per item
      if (quantity > 10) {
        throw new AppError('Maximum 10 passes per item', 400);
      }

      const passType = await PassType.findById(passTypeId);
      if (!passType) {
        throw new AppError(`Pass type ${passTypeId} not found`, 404);
      }
      if (!passType.isActive) {
        throw new AppError(`Pass '${passType.name}' is no longer available`, 400);
      }

      // ── Capacity check ──
      if (passType.soldQuantity + quantity > passType.totalQuantity) {
        throw new AppError(
          `Not enough '${passType.name}' passes available. Only ${passType.availableQuantity} left.`,
          400
        );
      }

      const unitPrice = passType.price; // FROM DATABASE
      const subtotal = unitPrice * quantity;

      orderItems.push({
        passType: passType._id,
        passName: passType.name,
        quantity,
        unitPrice,
        subtotal,
      });

      totalAmount += subtotal;
    }

    // ── Atomically reserve stock for each pass type ──
    const reservedItems = [];
    try {
      for (const item of orderItems) {
        const updated = await PassType.findOneAndUpdate(
          {
            _id: item.passType,
            // Atomic check: ensure stock is still available at update time
            $expr: {
              $lte: [{ $add: ['$soldQuantity', item.quantity] }, '$totalQuantity'],
            },
          },
          { $inc: { soldQuantity: item.quantity } },
          { new: true }
        );

        if (!updated) {
          throw new AppError(`'${item.passName}' just sold out. Please try again.`, 409);
        }
        reservedItems.push(item);
      }
    } catch (err) {
      // Rollback any previously reserved stock
      for (const prev of reservedItems) {
        await PassType.findByIdAndUpdate(prev.passType, {
          $inc: { soldQuantity: -prev.quantity },
        });
      }
      throw err;
    }

    // ── Generate order number ──
    const orderNumber = generateOrderNumber();

    // ── Create Razorpay order (server-side, amount from DB) ──
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(totalAmount, orderNumber);
    } catch (err) {
      // Rollback stock if Razorpay order creation fails
      for (const item of reservedItems) {
        await PassType.findByIdAndUpdate(item.passType, {
          $inc: { soldQuantity: -item.quantity },
        });
      }
      throw new AppError('Failed to create payment order. Please try again.', 500);
    }

    // ── Save order in DB ──
    const order = await Order.create({
      orderNumber,
      user: req.user._id,
      items: orderItems,
      totalAmount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: 'created',
      orderStatus: 'created',
      buyerName,
      buyerEmail,
      buyerPhone,
      ...(idempotencyKey && { idempotencyKey }),
    });

    // ── Return checkout info ──
    // SECURITY: Only return the PUBLIC key (RAZORPAY_KEY_ID), NEVER the secret
    res.status(201).json({
      success: true,
      data: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currency: order.currency,
        razorpayOrderId: razorpayOrder.id,
        razorpayAmount: razorpayOrder.amount,
        key: env.RAZORPAY_KEY_ID,
        items: order.items,
        paymentStatus: order.paymentStatus,
      },
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        items: order.items,
        paymentStatus: order.paymentStatus,
      },
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,     // in paise
        currency: razorpayOrder.currency,
      },
      razorpayKeyId: env.RAZORPAY_KEY_ID, // PUBLIC key only — NEVER send secret
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders
 * List current user's orders.
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-razorpaySignature -idempotencyKey');

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders/:id
 * Get a single order detail.
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('-razorpaySignature -idempotencyKey');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow the order owner or admin
    if (!order.user.equals(req.user._id) && req.user.role !== 'admin') {
      throw new AppError('Unauthorized', 403);
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};
