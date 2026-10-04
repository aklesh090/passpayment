const PassType = require('../models/PassType');
const { AppError } = require('../utils/helpers');

/**
 * GET /api/passes
 * PUBLIC — list active purchasable pass types only.
 * Normal customers ONLY see passes with isActive: true.
 */
exports.getAllPasses = async (req, res, next) => {
  try {
    const passes = await PassType.find({ isActive: true }).sort({ price: -1 });
    res.json({
      success: true,
      count: passes.length,
      passes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/passes
 * ADMIN ONLY — list ALL passes (active + inactive) for management.
 */
exports.getAllPassesAdmin = async (req, res, next) => {
  try {
    const passes = await PassType.find({}).sort({ category: 1, price: -1 });
    res.json({
      success: true,
      count: passes.length,
      passes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/passes/:id
 * Get a single pass type by ID.
 */
exports.getPassById = async (req, res, next) => {
  try {
    const pass = await PassType.findById(req.params.id);
    if (!pass) {
      throw new AppError('Pass type not found', 404);
    }
    res.json({
      success: true,
      pass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/passes  (Admin)
 * Create a new pass type.
 *
 * Validation rules enforced here:
 *  - name, slug, category, applicableDays, price, totalQuantity required
 *  - price must be >= 0
 *  - applicableDays must be in range 1-9 (no Day 10+)
 *  - daily pass: applicableDays.length must be exactly 1
 *  - slug must be unique (MongoDB unique index also enforces this)
 */
exports.createPass = async (req, res, next) => {
  try {
    const { name, slug, category, applicableDays, price, totalQuantity, perks, isActive } = req.body;

    // ── Field presence ──
    if (!name || !slug || !category || !applicableDays || price == null || !totalQuantity) {
      throw new AppError('Missing required fields: name, slug, category, applicableDays, price, totalQuantity', 400);
    }

    // ── Category validation ──
    if (!['season', 'daily'].includes(category)) {
      throw new AppError('category must be "season" or "daily"', 400);
    }

    // ── Price ──
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      throw new AppError('price must be a valid non-negative number', 400);
    }

    // ── Quantity ──
    const qtyNum = Number(totalQuantity);
    if (isNaN(qtyNum) || qtyNum < 1) {
      throw new AppError('totalQuantity must be at least 1', 400);
    }

    // ── applicableDays ──
    if (!Array.isArray(applicableDays) || applicableDays.length === 0) {
      throw new AppError('applicableDays must be a non-empty array', 400);
    }
    const daysNum = applicableDays.map(Number);
    if (daysNum.some((d) => isNaN(d) || d < 1 || d > 9)) {
      throw new AppError('applicableDays must only contain numbers between 1 and 9 (no Day 10)', 400);
    }

    // ── Daily pass: exactly one day ──
    if (category === 'daily' && daysNum.length !== 1) {
      throw new AppError('A daily pass must have exactly one applicableDay', 400);
    }

    // ── Slug: normalize ──
    const normalizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');

    const pass = await PassType.create({
      name: name.trim(),
      slug: normalizedSlug,
      category,
      applicableDays: daysNum,
      price: priceNum,
      totalQuantity: qtyNum,
      perks: Array.isArray(perks) ? perks.filter(Boolean) : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Pass created successfully',
      pass,
    });
  } catch (error) {
    // MongoDB duplicate key on slug
    if (error.code === 11000) {
      return next(new AppError('A pass with this slug already exists. Choose a different slug/name.', 409));
    }
    next(error);
  }
};

/**
 * PUT /api/admin/passes/:id  (Admin)
 * Update a pass type.
 *
 * Allowed fields: name, price, totalQuantity, perks, isActive, applicableDays, category
 *
 * HISTORICAL ORDER PROTECTION:
 *   Changing price here does NOT retroactively alter any Order document.
 *   The order.controller already snapshots unitPrice at order creation time
 *   (order.items[].unitPrice = passType.price at that moment).
 *   Existing orders remain unchanged. New orders will use the updated price.
 *
 * NOT allowed to change: slug (breaks existing references), soldQuantity
 */
exports.updatePass = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'price', 'totalQuantity', 'perks', 'isActive', 'applicableDays', 'category'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // ── Validate price if provided ──
    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (isNaN(p) || p < 0) {
        throw new AppError('price must be a valid non-negative number', 400);
      }
      updates.price = p;
    }

    // ── Validate totalQuantity if provided ──
    if (updates.totalQuantity !== undefined) {
      const q = Number(updates.totalQuantity);
      if (isNaN(q) || q < 1) {
        throw new AppError('totalQuantity must be at least 1', 400);
      }
      updates.totalQuantity = q;
    }

    // ── Validate applicableDays if provided ──
    if (updates.applicableDays !== undefined) {
      const daysNum = updates.applicableDays.map(Number);
      if (daysNum.some((d) => isNaN(d) || d < 1 || d > 9)) {
        throw new AppError('applicableDays must only contain numbers between 1 and 9 (no Day 10)', 400);
      }
      updates.applicableDays = daysNum;
    }

    // ── Validate category if provided ──
    if (updates.category !== undefined && !['season', 'daily'].includes(updates.category)) {
      throw new AppError('category must be "season" or "daily"', 400);
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields provided for update', 400);
    }

    const pass = await PassType.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!pass) {
      throw new AppError('Pass type not found', 404);
    }

    res.json({
      success: true,
      message: 'Pass updated successfully',
      pass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/passes/:id/toggle  (Admin)
 * Toggle isActive status atomically.
 * Returns the updated pass with the new isActive value.
 *
 * Deactivation rule:
 *   - Deactivated passes are NOT purchasable (enforced in order.controller: passType.isActive check)
 *   - Existing paid tickets/orders remain valid and unmodified
 *   - The admin can re-activate the pass at any time
 */
exports.togglePassActive = async (req, res, next) => {
  try {
    const pass = await PassType.findById(req.params.id);
    if (!pass) {
      throw new AppError('Pass type not found', 404);
    }

    pass.isActive = !pass.isActive;
    await pass.save();

    res.json({
      success: true,
      message: `Pass ${pass.isActive ? 'activated' : 'deactivated'} successfully`,
      pass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/passes/:id (Admin)
 * Soft-delete: set isActive = false.
 * Hard deletion is intentionally NOT supported — passes may be referenced by orders/tickets.
 * Use the toggle endpoint or updatePass to manage status.
 */
exports.deletePass = async (req, res, next) => {
  try {
    const pass = await PassType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!pass) {
      throw new AppError('Pass type not found', 404);
    }

    res.json({
      success: true,
      message: 'Pass type deactivated (soft delete). Historical orders and tickets remain unaffected.',
    });
  } catch (error) {
    next(error);
  }
};

