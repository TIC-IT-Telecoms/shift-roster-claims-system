import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { generateToken } from '../utils/jwt.js';
import { Employee, Team, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { sendOtpEmail } from '../utils/emailService.js';
import { sendResetEmail } from '../utils/emailService.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// Memory cache mapping for temporary multi-factor validation entries
// Format: username -> { otpCode, expiresAt, userId, role }
// const otpCache = new Map();

// @desc    Login user (Phase 1: Password Check -> Enforce OTP for ALL Roles)
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
  const employee = await Employee.findOne({
    where: { employee_id: user.employee_id },
    attributes: ['email', 'name', 'position'],
    include: [{ model: User, as: 'user', attributes: ['role'] },
    { model: Team, as: 'team', attributes: ['team_name'] }],
  });

  const token = generateToken({
    id: user.user_id,
    role: user.role,
  });

  res.cookie('token', token, COOKIE_OPTIONS);
  // Generate a secure 6-digit numeric verification token
  // const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  // const tokenLifespan = Date.now() + 5 * 60 * 1000; // 5-minute validation window

  // // Stash account session variables inside our short-lived cache (Admins & Employees)
  // otpCache.set(username.toLowerCase().trim(), {
  //   otpCode: generatedOtp,
  //   expiresAt: tokenLifespan,
  //   userId: user.user_id,
  //   role: user.role,
  // });

  // // Dispatch via your .env configured SMTP server
  // await sendOtpEmail(user.username, generatedOtp);
  // logger.info(`MFA Stage 1 initiated for ${user.role} (User ID: ${user.user_id}). OTP sent.`);

  // // Always require OTP verification on the frontend interface
  // return successResponse(res, { username: user.username, requiresOtp: true },
  //   `Verification code sent to your registered email address (${user.role} verification required)`
  // );
  return successResponse(res, { employee },
    `Login successful. Welcome back, ${employee.name}!`
  );
});

// @desc    Verify OTP Token (Phase 2: Finalize Session & Return Dashboard Target)
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { username, otpCode } = req.body;

  if (!username || !otpCode) {
    return next(new ErrorResponse('Username and verification code are required', 400));
  }

  const normalizedUsername = username.toLowerCase().trim();
  const cachedRecord = otpCache.get(normalizedUsername);

  if (!cachedRecord) {
    return next(new ErrorResponse('Session expired or authentication request not initiated', 400));
  }

  // Verify code expiration window boundaries
  if (Date.now() > cachedRecord.expiresAt) {
    otpCache.delete(normalizedUsername);
    return next(new ErrorResponse('Verification code has expired. Please log in again.', 401));
  }

  // Validate Code Match
  if (cachedRecord.otpCode !== otpCode.trim()) {
    logger.warn(`MFA code mismatch recorded for profile: ${normalizedUsername}`);
    return next(new ErrorResponse('Invalid verification code', 401));
  }

  // Issue final authenticated JWT session token
  const token = generateToken({ id: cachedRecord.userId, role: cachedRecord.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  // Clear cache record immediately to prevent token reuse vulnerabilities
  otpCache.delete(normalizedUsername);
  logger.info(`MFA validated successfully. ${cachedRecord.role} ID ${cachedRecord.userId} authorized.`);

  // Return the user's role so your frontend router can handle dashboard redirection
  return successResponse(res, {
    role: cachedRecord.role,
    redirectTo: cachedRecord.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard'
  }, 'Authentication completed successfully');
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  logger.info(`User logged out: ID ${req.user?.id}`);
  return successResponse(res, null, 'Logged out successfully');
});

// @desc    Verify employee email and dispatch a secure reset token link
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Email is required', 400));
  }
  
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { username: normalizedEmail } });

  // Security Note: We return success regardless to mitigate account harvesting scanning attacks
  if (!user) {
    logger.warn(`Forgot password lookup failed: non-existent target "${normalizedEmail}"`);
    return successResponse(res, null, 'If this email is registered, a password reset link has been dispatched.');
  }

  // Generate unique crypto string and establish 1 hour lifecycle
  const resetToken = crypto.randomBytes(20).toString('hex');
  const tokenExpires = Date.now() + 3600000; // 1 Hour lifespan

  // Store variables safely in DB
  await user.update({
    reset_password_token: resetToken,
    reset_password_expires: tokenExpires
  });

  // Automatically adapt link based on whether frontend requests from port 5173 or 3000
  const requestOrigin = req.get('origin') || 'http://localhost:5173';
  const resetUrl = `${requestOrigin}/reset-password?token=${resetToken}`;

  try {
    // Fire the real SMTP transport dispatch rule
    await sendResetEmail(user.username, resetUrl);
    
    return successResponse(res, null, 'If this email is registered, a password reset link has been dispatched.');
  } catch (error) {
    // Clear token out if email dispatch crashes completely
    await user.update({ reset_password_token: null, reset_password_expires: null });
    return next(new ErrorResponse('Email delivery system failed. Please contact support.', 500));
  }
});

// @desc    Consume secure reset token payload, validate expiry, and rewrite login hash
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { reset_token, new_password, confirm_password } = req.body;

  if (!reset_token) {
    return next(new ErrorResponse('Reset token is missing or corrupted.', 400));
  }

  if (!new_password || new_password.length < 8) {
    return next(new ErrorResponse('A valid password of at least 8 characters is required.', 400));
  }

  if (new_password !== confirm_password) {
    return next(new ErrorResponse('Passwords do not match.', 400));
  }

  // Look for active record containing non-expired token
  const user = await User.findOne({
    where: {
      reset_password_token: reset_token,
      reset_password_expires: { [Op.gt]: Date.now() }
    }
  });

  if (!user) {
    return next(new ErrorResponse('The password reset token is invalid or has expired.', 400));
  }

  // Hash new text string choice
  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(new_password, salt);
  
  // Wipe parameters completely
  user.reset_password_token = null;
  user.reset_password_expires = null;
  await user.save();

  logger.info(`Password updated successfully for account user ID: ${user.user_id}`);
  return successResponse(res, null, 'Password reset successful.');
});