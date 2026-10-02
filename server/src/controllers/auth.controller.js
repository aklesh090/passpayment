const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const env = require('../config/env');
const { AppError, generateOTP } = require('../utils/helpers');
const { sendPasswordResetOTP } = require('../services/email.service');

/**
 * Generate access + refresh tokens for a user.
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 * Register a new user — no OTP required.
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      throw new AppError('All fields are required: name, email, phone, password', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const user = await User.create({ name, email, phone, passwordHash: password });
    const tokens = generateTokens(user);

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      user: user.toJSON(),
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email + password — no OTP required.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const tokens = generateTokens(user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: user.toJSON(),
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token from cookie.
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new AppError('No refresh token provided', 401);
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    const tokens = generateTokens(user);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 */
exports.getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clear refresh token cookie.
 */
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Send OTP to email for password reset.
 * This is the ONLY place OTP emails are sent.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal whether email exists
      return res.json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.',
      });
    }

    // Invalidate any existing OTPs for this user
    await PasswordResetOTP.deleteMany({ email: user.email });

    // Generate and save new OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    await PasswordResetOTP.create({
      user: user._id,
      email: user.email,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send via email (SMTP)
    await sendPasswordResetOTP(user.email, otp, user.name);

    res.json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP without resetting password (optional step).
 */
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new AppError('Email and OTP are required', 400);
    }

    const otpRecord = await PasswordResetOTP.findOne({
      email: email.toLowerCase(),
      isUsed: false,
    });

    if (!otpRecord) throw new AppError('Invalid or expired OTP', 400);
    if (otpRecord.isExpired()) throw new AppError('OTP has expired', 400);

    // Enforce max attempts to prevent brute-force
    if (otpRecord.attempts >= 5) {
      throw new AppError('Too many failed attempts. Please request a new OTP.', 429);
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new AppError('Invalid OTP', 400);
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Verify OTP and set new password.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError('Email, OTP, and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const otpRecord = await PasswordResetOTP.findOne({
      email: email.toLowerCase(),
      isUsed: false,
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (otpRecord.isExpired()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Check max attempts
    if (otpRecord.attempts >= 5) {
      throw new AppError('Too many failed attempts. Please request a new OTP.', 429);
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new AppError('Invalid OTP', 400);
    }

    // Mark OTP as used in a single save (no need to increment attempts on success)
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update password
    const user = await User.findById(otpRecord.user).select('+passwordHash');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.passwordHash = newPassword;
    await user.save(); // pre-save hook will hash it

    // Clean up OTPs
    await PasswordResetOTP.deleteMany({ email: email.toLowerCase() });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};
