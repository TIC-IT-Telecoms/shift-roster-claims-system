import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

import { generateToken } from '../utils/jwt.js';

import { asyncHandler } from '../utils/asyncHandler.js';

import { ErrorResponse } from '../utils/ErrorResponse.js';

import { successResponse } from '../utils/apiResponse.js';

import { logger } from '../utils/logger.js';

import { sendOtpEmail } from '../utils/emailService.js';



const COOKIE_OPTIONS = {

  httpOnly: true,

  secure: process.env.NODE_ENV === 'production',

  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',

  maxAge: 24 * 60 * 60 * 1000, // 1 day

};



// Memory cache mapping for temporary multi-factor validation entries

// Format: username -> { otpCode, expiresAt, userId, role }

const otpCache = new Map();



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



  // Generate a secure 6-digit numeric verification token

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const tokenLifespan = Date.now() + 5 * 60 * 1000; // 5-minute validation window



  // Stash account session variables inside our short-lived cache (Admins & Employees)

  otpCache.set(username.toLowerCase().trim(), {

    otpCode: generatedOtp,

    expiresAt: tokenLifespan,

    userId: user.user_id,

    role: user.role,

  });



  // Dispatch via your .env configured SMTP server

  await sendOtpEmail(user.username, generatedOtp);



  logger.info(`MFA Stage 1 initiated for ${user.role} (User ID: ${user.user_id}). OTP sent.`);



  // Always require OTP verification on the frontend interface

  return successResponse(

    res,

    { username: user.username, requiresOtp: true },

    `Verification code sent to your registered email address (${user.role} verification required)`

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

  return successResponse(

    res,

    {

      role: cachedRecord.role,

      redirectTo: cachedRecord.role === 'Admin' ? '/admin/dashboard' : '/employee/dashboard'

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

