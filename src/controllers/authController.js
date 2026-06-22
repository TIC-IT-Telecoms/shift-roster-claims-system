import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { generateToken } from '../utils/jwt.js';
import { Employee, Team, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { sendOtpEmail, sendResetEmail } from '../utils/emailService.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// ACTIVATED: Global memory cache map for temporary multi-factor validation entries
// Format: username -> { otpCode, expiresAt, userId, employeeData }
const otpCache = new Map();

// @desc    Login user (Phase 1: Password Check -> Enforce OTP for ALL Roles)
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorResponse('Username and password are required', 400));
  }

  const normalizedUsername = username.toLowerCase().trim();
  const user = await User.findOne({ where: { username: normalizedUsername } });

  if (!user) {
    logger.warn(`Login failed: username "${normalizedUsername}" not found`);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    logger.warn(`Login failed: incorrect password for username "${normalizedUsername}"`);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Fetch comprehensive employee relationship structures
  const employee = await Employee.findOne({
    where: { employee_id: user.employee_id },
    attributes: ['email', 'name', 'position','status'],
    include: [
      { model: User, as: 'user', attributes: ['role'] },
      { model: Team, as: 'team', attributes: ['team_name'] },
    ],
  });

  if(employee.status === "Inactive"){
    logger.warn(`Deactivated Employee can't access the system with ID: ${employee.employee_id}`);
    return next(new ErrorResponse('Your account is deactivated', 400));
  }

  // ACTIVATED: Generate a secure 6-digit numeric verification token
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenLifespan = Date.now() + 5 * 60 * 1000; // 5-minute validation window

  // ACTIVATED: Stash variables inside the runtime cache map
  otpCache.set(normalizedUsername, {
    otpCode: generatedOtp,
    expiresAt: tokenLifespan,
    userId: user.user_id,
    role: user.role,
    employeeData: employee, // Stashed here to return to frontend on Phase 2 success
  });

  try {
    // Dispatch token via your configured SMTP server
    await sendOtpEmail(user.username, generatedOtp);
    logger.info(`MFA Stage 1 initiated for ${user.role} (User ID: ${user.user_id}). OTP sent.`);

    // Intercept immediate login and flag that OTP verification is required
    return successResponse(
      res,
      { username: user.username, requiresOtp: true },
      `Verification code sent to your registered email address.`
    );
  } catch (error) {
    otpCache.delete(normalizedUsername);
    logger.error(`Failed to deliver login OTP email to ${user.username}: ${error.message}`);
    return next(new ErrorResponse('Failed to send verification code. Please try again.', 500));
  }
});

// @desc    Verify OTP Token (Phase 2: Finalize Session & Return Dashboard Target)
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res, next) => {
  // ALIGNED: Expects 'email' from the request body to match your frontend payload
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorResponse('Email and verification code are required', 400));
  }

  const normalizedUsername = email.toLowerCase().trim();
  const cachedRecord = otpCache.get(normalizedUsername);

  if (!cachedRecord) {
    return next(new ErrorResponse('Session expired or authentication request not initiated.', 400));
  }

  // Verify code expiration window boundaries
  if (Date.now() > cachedRecord.expiresAt) {
    otpCache.delete(normalizedUsername);
    return next(new ErrorResponse('Verification code has expired. Please log in again.', 401));
  }

  // Validate Code Match
  if (cachedRecord.otpCode !== otp.trim()) {
    logger.warn(`MFA code mismatch recorded for profile: ${normalizedUsername}`);
    return next(new ErrorResponse('Invalid verification code', 401));
  }

  // Issue final authenticated JWT session token now that identity is established
  const token = generateToken({ id: cachedRecord.userId, role: cachedRecord.role });
  res.cookie('token', token, COOKIE_OPTIONS);

    await User.update(
    { last_login: new Date() },
    { where: { user_id: cachedRecord.userId } }
  );
  
  // Clear cache record immediately to prevent replay attacks
  otpCache.delete(normalizedUsername);
  logger.info(`MFA validated successfully. ${cachedRecord.role} ID ${cachedRecord.userId} authorized.`);


  // ALIGNED: Returns structural data expected by useVerifyOtp hook inside useAuth.js
  return successResponse(
    res,
    { employee: cachedRecord.employeeData },
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

  if (!user) {
    logger.warn(`Forgot password lookup failed: non-existent target "${normalizedEmail}"`);
    return successResponse(res, null, 'If this email is registered, a password reset link has been dispatched.');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  const tokenExpires = Date.now() + 3600000; // 1 Hour lifespan

  await user.update({
    reset_password_token: resetToken,
    reset_password_expires: tokenExpires,
  });

  const requestOrigin = req.get('origin') || 'http://localhost:5173';
  const resetUrl = `${requestOrigin}/reset-password?token=${resetToken}`;

  try {
    await sendResetEmail(user.username, resetUrl);
    return successResponse(res, null, 'If this email is registered, a password reset link has been dispatched.');
  } catch (error) {
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

  const user = await User.findOne({
    where: {
      reset_password_token: reset_token,
      reset_password_expires: { [Op.gt]: Date.now() },
    },
  });

  if (!user) {
    return next(new ErrorResponse('The password reset token is invalid or has expired.', 400));
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(new_password, salt);

  user.reset_password_token = null;
  user.reset_password_expires = null;
  await user.save();

  logger.info(`Password updated successfully for account user ID: ${user.user_id}`);
  return successResponse(res, null, 'Password reset successful.');
});