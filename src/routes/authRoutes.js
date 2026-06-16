import express from 'express';
import { login, verifyOtp, logout, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

router.post('/verify-otp', verifyOtp);

// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', resetPassword);

export default router;