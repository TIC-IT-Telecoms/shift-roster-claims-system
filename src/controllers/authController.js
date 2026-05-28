import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { generateToken } from '../utils/jwt.js'; 
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// @desc    Login user (Direct single-phase password verification)
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorResponse('Username and password are required', 400));
  }

  const user = await User.findOne({ where: { username } });

  if (!user) {
    logger.warn(`Login failed: username "${username}" not found`);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    logger.warn(`Login failed: incorrect password for username "${username}"`);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Issue the authenticated JWT session token directly upon successful password check
  const token = generateToken({ id: user.user_id, role: user.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info(`User authenticated successfully: ${user.role} (User ID: ${user.user_id})`);

  // Instantly return the redirection route so the frontend can route the user immediately
  return successResponse(
    res, 
    { 
      role: user.role,
      redirectTo: user.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard'
    }, 
    'Authentication completed successfully'
  );
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  logger.info(`User logged out: ID ${req.user?.id}`);
  return successResponse(res, null, 'Logged out successfully');
});

// @desc    Verify employee by email before password reset
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Email is required', 400));
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ where: { username: normalizedEmail } });

  if (!user) {
    logger.warn(`Forgot password: no account found for email "${normalizedEmail}"`);
    return successResponse(res, null, 'If this email is registered, an admin will assist with your reset');
  }

  logger.info(`Forgot password requested for username ${normalizedEmail}`);
  return successResponse(res, null, 'If this email is registered, an admin will assist with your reset');
});