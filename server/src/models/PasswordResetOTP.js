const mongoose = require('mongoose');

const passwordResetOTPSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // TTL index: auto-delete after 10 minutes
  },
});

// Index for fast lookups + automatic expiry
passwordResetOTPSchema.index({ email: 1 });
passwordResetOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check whether this OTP has expired.
 */
passwordResetOTPSchema.methods.isExpired = function () {
  return Date.now() > this.expiresAt.getTime();
};

const PasswordResetOTP = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);

module.exports = PasswordResetOTP;
