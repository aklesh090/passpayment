const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyJWT } = require('../middleware/auth.middleware');

// Public routes — no OTP for login/register
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Forgot password — OTP sent via email (SMTP only)
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', verifyJWT, authController.getMe);

module.exports = router;
