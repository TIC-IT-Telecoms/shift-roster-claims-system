import bcrypt from 'bcryptjs';
import { User, Employee } from '../models/index.js';
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

// @desc    Login user
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

  const token = generateToken({id: user.user_id, role: user.role});

  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info(`User logged in: ID ${user.user_id} | role: ${user.role}`);

  return successResponse(res, { role: user.role }, 'Login successful');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);

  logger.info(`User logged out: ID ${req.user?.id}`);

  return successResponse(res, null, 'Logged out successfully');
});

// @desc    Reset password (authenticated user resets their own)
// @route   PUT /api/auth/reset-password
// @access  Private
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return next(new ErrorResponse('All fields are required', 400));
  }

  if (new_password === old_password) {
    return next(new ErrorResponse('New password must differ from old password', 400));
  }

  if (new_password !== confirm_password) {
    return next(new ErrorResponse('Passwords do not match', 400));
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const isMatch = await bcrypt.compare(old_password, user.password_hash);

  if (!isMatch) {
    logger.warn(`Reset password failed: incorrect old password for user ID ${user.user_id}`);
    return next(new ErrorResponse('Old password is incorrect', 401));
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(new_password, salt);
  await user.save();

  logger.info(`Password reset successful: user ID ${user.user_id}`);

  return successResponse(res, null, 'Password updated successfully');
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

  const employee = await Employee.findOne({
    where: { email: normalizedEmail },
    include: [{ association: 'user', attributes: ['user_id'] }],
  });

  // Always return the same response whether found or not — prevents email enumeration
  if (!employee || !employee.user) {
    logger.warn(`Forgot password: no account found for email "${normalizedEmail}"`);
    return successResponse(res, null, 'If this email is registered, an admin will assist with your reset');
  }

  logger.info(`Forgot password requested for employee ID ${employee.employee_id}`);

  // No token or link yet — flagging for admin-assisted reset
  // TODO: integrate email/notification service when available
  return successResponse(res, null, 'If this email is registered, an admin will assist with your reset');
});