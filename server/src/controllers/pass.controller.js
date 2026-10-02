const PassType = require('../models/PassType');
const { AppError } = require('../utils/helpers');

/**
 * GET /api/passes
 * List all active pass types.
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
 * POST /api/passes (Admin)
 * Create a new pass type.
 */
exports.createPass = async (req, res, next) => {
  try {
    const { name, slug, category, applicableDays, price, totalQuantity, perks } = req.body;

    if (!name || !slug || !category || !applicableDays || price == null || !totalQuantity) {
      throw new AppError('Missing required fields', 400);
    }

    const pass = await PassType.create({
      name,
      slug,
      category,
      applicableDays,
      price,
      totalQuantity,
      perks: perks || [],
    });

    res.status(201).json({
      success: true,
      pass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/passes/:id (Admin)
 * Update a pass type.
 */
exports.updatePass = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'price', 'totalQuantity', 'perks', 'isActive'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
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
      pass,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/passes/:id (Admin)
 * Soft-delete a pass type (set isActive = false).
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
      message: 'Pass type deactivated',
    });
  } catch (error) {
    next(error);
  }
};
