const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const PassType = require('../models/PassType');
const User = require('../models/User');
const { AppError } = require('../utils/helpers');

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
 * POST /api/admin/verify-ticket
 * Verify a ticket ID (via QR token) and check-in for a specific day.
 * Must verify order is PAID, ticket exists, ticket ACTIVE, and not USED.
 */
exports.verifyTicket = async (req, res, next) => {
  try {
    const { token, day } = req.body;

    if (!token || !day) {
      throw new AppError('token and day are required', 400);
    }

    if (day < 1 || day > 9) {
      throw new AppError('Day must be between 1 and 9', 400);
    }

    const ticket = await Ticket.findOne({ qrToken: token }).populate('order');

    if (!ticket) {
      return res.json({
        success: true,
        valid: false,
        reason: 'Ticket not found',
      });
    }

    if (ticket.order.paymentStatus !== 'paid') {
      return res.json({
        success: true,
        valid: false,
        reason: `Order payment status is ${ticket.order.paymentStatus}`,
        ticket: {
          ticketId: ticket.ticketId,
          holderName: ticket.holderName,
          passName: ticket.passName
        }
      });
    }

    if (ticket.status !== 'active') {
      return res.json({
        success: true,
        valid: false,
        reason: `Ticket is ${ticket.status}`,
        ticket: {
          ticketId: ticket.ticketId,
          holderName: ticket.holderName,
          passName: ticket.passName
        }
      });
    }

    // Check if this pass is valid for the requested day
    if (!ticket.validDays.includes(Number(day))) {
      return res.json({
        success: true,
        valid: false,
        reason: `Ticket not valid for Day ${day}`,
        ticket: {
          ticketId: ticket.ticketId,
          holderName: ticket.holderName,
          passName: ticket.passName,
          validDays: ticket.validDays,
        },
      });
    }

    // Check if already checked in today
    const alreadyCheckedIn = ticket.checkIns.some((c) => c.day === Number(day));
    if (alreadyCheckedIn) {
      return res.json({
        success: true,
        valid: false,
        reason: `ALREADY USED for Day ${day}`,
        ticket: {
          ticketId: ticket.ticketId,
          holderName: ticket.holderName,
          passName: ticket.passName,
        },
      });
    }

    // ── Atomic check-in: only add if no existing check-in for this day ──
    // The $not/$elemMatch query ensures this is race-condition safe.
    const updatedTicket = await Ticket.findOneAndUpdate(
      {
        _id: ticket._id,
        status: 'active',
        'checkIns.day': { $ne: Number(day) }, // Only proceed if day not already checked in
      },
      {
        $push: {
          checkIns: {
            day: Number(day),
            checkedInAt: new Date(),
            checkedInBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    if (!updatedTicket) {
      // Either ticket was updated by concurrent scan, or status changed
      // Re-fetch to determine which case it is
      const recheck = await Ticket.findById(ticket._id);
      if (recheck.checkIns.some((c) => c.day === Number(day))) {
        return res.json({
          success: true,
          valid: false,
          reason: `ALREADY USED for Day ${day}`,
          ticket: {
            ticketId: ticket.ticketId,
            holderName: ticket.holderName,
            passName: ticket.passName,
          },
        });
      }
      return res.json({
        success: true,
        valid: false,
        reason: 'Ticket status changed. Please re-scan.',
        ticket: {
          ticketId: ticket.ticketId,
          holderName: ticket.holderName,
          passName: ticket.passName,
        },
      });
    }

    // Update status to 'used' if all valid days are now consumed (or day pass)
    const totalCheckIns = updatedTicket.checkIns.length;
    const totalValidDays = updatedTicket.validDays.length;
    if (totalValidDays === 1 || totalCheckIns === totalValidDays) {
      await Ticket.findByIdAndUpdate(updatedTicket._id, { $set: { status: 'used' } });
    }

    res.json({
      success: true,
      valid: true,
      reason: 'Admitted',
      ticket: {
        ticketId: updatedTicket.ticketId,
        holderName: updatedTicket.holderName,
        passName: updatedTicket.passName,
        validDays: updatedTicket.validDays,
      },
    });
  } catch (error) {
    next(error);
  }
};
