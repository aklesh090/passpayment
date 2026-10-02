const mongoose = require('mongoose');

const passTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Pass name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['season', 'daily'],
      required: [true, 'Pass category is required'],
    },
    applicableDays: {
      type: [Number],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length > 0 && arr.every((d) => d >= 1 && d <= 9);
        },
        message: 'applicableDays must contain day numbers between 1 and 9',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [1, 'Total quantity must be at least 1'],
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    perks: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: available quantity
passTypeSchema.virtual('availableQuantity').get(function () {
  return this.totalQuantity - this.soldQuantity;
});

// Ensure virtuals show in JSON
passTypeSchema.set('toJSON', { virtuals: true });
passTypeSchema.set('toObject', { virtuals: true });

// Index for uniqueness
passTypeSchema.index({ slug: 1 }, { unique: true });

const PassType = mongoose.model('PassType', passTypeSchema);

module.exports = PassType;
