const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const PassType = require('../models/PassType');
const User = require('../models/User');
const TicketEntry = require('../models/TicketEntry');
const { AppError } = require('../utils/helpers');
const { validateTicketForEntry, RESULT } = require('../services/ticketValidation.service');
const { getCurrentEventSession } = require('../services/eventSession.service');

/**
 * GET /api/admin/dashboard
 * Detailed statistics and charts for the admin panel.
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalOrdersAll,
      totalTickets,
      totalUsers,
      passTypes,
      paidOrdersCount,
      failedOrdersCount,
      cancelledOrdersCount,
      orders
    ] = await Promise.all([
      Order.countDocuments(),
      Ticket.countDocuments(),
      User.countDocuments({ role: 'user' }),
      PassType.find().select('name category soldQuantity totalQuantity price'),
      Order.countDocuments({ paymentStatus: 'paid' }),
      Order.countDocuments({ paymentStatus: 'failed' }),
      Order.countDocuments({ paymentStatus: 'refunded' }),
      Order.find({ paymentStatus: 'paid' }).select('totalAmount items createdAt'),
    ]);

    let totalRevenue = 0;
    const revenueOverTime = {};
    const salesByPassType = {};

    orders.forEach(order => {
      totalRevenue += order.totalAmount;
      
      const date = order.createdAt.toISOString().split('T')[0];
      if (!revenueOverTime[date]) revenueOverTime[date] = 0;
      revenueOverTime[date] += order.totalAmount;

      order.items.forEach(item => {
        const pName = item.passName;
        if (!salesByPassType[pName]) salesByPassType[pName] = { revenue: 0, count: 0 };
        salesByPassType[pName].revenue += (item.unitPrice * item.quantity);
        salesByPassType[pName].count += item.quantity;
      });
    });

    const vipSales = passTypes.filter(p => p.name.toLowerCase().includes('vip')).reduce((acc, curr) => acc + curr.soldQuantity, 0);
    const gaSales = passTypes.filter(p => p.name.toLowerCase().includes('ga') || p.name.toLowerCase().includes('general')).reduce((acc, curr) => acc + curr.soldQuantity, 0);
    const dayPassSales = passTypes.filter(p => p.category === 'daily').reduce((acc, curr) => acc + curr.soldQuantity, 0);

    const ticketUsage = await Ticket.aggregate([
      { $unwind: '$checkIns' },
      { $group: { _id: '$checkIns.day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      dashboard: {
        totalRevenue,
        totalOrders: totalOrdersAll,
        paidOrders: paidOrdersCount,
        failedOrders: failedOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        totalTickets,
        totalUsers,
        vipSales,
        gaSales,
        dayPassSales,
        charts: {
          salesByPassType: Object.keys(salesByPassType).map(key => ({ name: key, ...salesByPassType[key] })),
          revenueOverTime: Object.keys(revenueOverTime).map(key => ({ date: key, revenue: revenueOverTime[key] })).sort((a,b) => new Date(a.date) - new Date(b.date)),
          ticketUsage: ticketUsage.map(t => ({ day: `Day ${t._id}`, count: t.count }))
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/orders
 * All orders with optional filters.
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const { paymentStatus, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { buyerEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-razorpaySignature');

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = { role: 'user' };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-password');

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tickets
 */
exports.getAllTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.ticketId = { $regex: search, $options: 'i' };
    }

    const tickets = await Ticket.find(filter)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber paymentStatus totalAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-qrCode');

    const total = await Ticket.countDocuments(filter);

    res.json({
      success: true,
      count: tickets.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tickets/:id/cancel
 */
exports.cancelTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) throw new AppError('Ticket not found', 404);

    ticket.status = 'cancelled';
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket cancelled successfully',
      ticket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/session
 * Returns the current event session info (server-authoritative).
 * Used by the scanner UI to display which day is active.
 * The frontend MUST NOT trust this to bypass validation — it is informational only.
 */
exports.getEventSession = async (req, res, next) => {
  try {
    const session = getCurrentEventSession();
    res.json({
      success: true,
      session: {
        active:       session.active,
        eventDay:     session.eventDay,
        sessionStart: session.sessionStart,
        sessionEnd:   session.sessionEnd,
        message:      session.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/verify-ticket
 *
 * ── REWRITTEN: now uses ticketValidation.service ──
 *
 * Accepts either:
 *   - `token` = qrToken (64-char hex from QR code scan)
 *   - `token` = ticketId (human-readable, e.g. RR20-VIP-00001-A4B2)
 *
 * The `day` field from the request body is IGNORED for security.
 * Event day is always resolved server-side from the authoritative schedule.
 *
 * Returns a machine-readable `result` code and human-readable `message`.
 */
exports.verifyTicket = async (req, res, next) => {
  try {
    const { token } = req.body;
    // NOTE: `day` from body is intentionally ignored — server determines event day.

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new AppError('token is required', 400);
    }

    const outcome = await validateTicketForEntry({
      identifier: token.trim(),
      scannedBy:  req.user._id,
    });

    // Map to response shape (backward-compatible + enhanced)
    return res.json({
      success: true,
      valid:    outcome.valid,
      result:   outcome.result,
      reason:   outcome.message,   // kept for backward compat with old scanner UI
      message:  outcome.message,
      eventDay: outcome.eventDay,
      eventDate: outcome.eventDate || null,
      ticket:   outcome.ticket || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tickets/:id/entries
 * List all entry records for a specific ticket (by MongoDB _id).
 */
exports.getTicketEntries = async (req, res, next) => {
  try {
    const entries = await TicketEntry.find({ ticket: req.params.id })
      .populate('scannedBy', 'name email')
      .sort({ eventDay: 1 });

    res.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports/csv
 *
 * Server-side CSV sales report download.
 *
 * WHY server-side:
 *   The previous client-side `data:text/csv;...` URI approach fails completely
 *   on iOS Safari — the browser navigates to the raw data URI instead of
 *   triggering a download, making the report inaccessible on mobile.
 *
 *   By generating the CSV on the server and streaming it with the correct
 *   Content-Disposition: attachment header, the browser receives a proper
 *   HTTP download in ALL environments (Android Chrome, iPhone Safari, desktop).
 *
 * SECURITY: Protected by verifyJWT + requireAdmin (applied at router level).
 *   Normal users receive HTTP 403 before reaching this handler.
 */
exports.downloadSalesReportCSV = async (req, res, next) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' })
      .select('totalAmount items createdAt buyerName buyerEmail orderNumber');

    const salesByPassType = {};
    let totalRevenue = 0;
    let totalTickets = 0;

    orders.forEach((order) => {
      totalRevenue += order.totalAmount;
      order.items.forEach((item) => {
        const name = item.passName;
        if (!salesByPassType[name]) salesByPassType[name] = { revenue: 0, count: 0 };
        salesByPassType[name].revenue += item.unitPrice * item.quantity;
        salesByPassType[name].count   += item.quantity;
        totalTickets += item.quantity;
      });
    });

    const rows = [];
    rows.push('Pass Name,Quantity Sold,Revenue (INR)');

    Object.keys(salesByPassType)
      .sort()
      .forEach((name) => {
        const { count, revenue } = salesByPassType[name];
        const safeName = `"${name.replace(/"/g, '""')}"`;
        rows.push(`${safeName},${count},${revenue}`);
      });

    rows.push('');
    rows.push(`"TOTAL",${totalTickets},${totalRevenue}`);
    rows.push('');
    rows.push(`"Report generated","${new Date().toISOString()}",""`);
    rows.push(`"Total paid orders","${orders.length}",""`);

    const csvBody = rows.join('\r\n');
    const reportDate = new Date().toISOString().split('T')[0];
    const filename = `sales_report_${reportDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    // UTF-8 BOM for Excel compatibility
    res.send('\uFEFF' + csvBody);
  } catch (error) {
    next(error);
  }
};

