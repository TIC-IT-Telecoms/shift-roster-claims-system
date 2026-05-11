import express from 'express';
import { login, logout, resetPassword, forgotPassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @route   PUT /api/auth/reset-password
// @access  Private
router.put('/reset-password', protect, resetPassword);

// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPassword);

export default router;