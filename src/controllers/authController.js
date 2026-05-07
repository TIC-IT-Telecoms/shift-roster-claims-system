import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';

export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ where: { username } });

  if (!user) {
    throw new ErrorResponse('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new ErrorResponse('Invalid credentials', 401);
  }

  const token = generateToken({
    id: user.user_id,
    role: user.role,
  });

  res.cookie('token', token, {
    httpOnly: true,       
    secure: false,       
    sameSite: 'lax',       
    maxAge: 24 * 60 * 60 * 1000 
  });

  return successResponse(res, { token, role: user.role }, 'Login successful');
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false
  });

  return successResponse(res, null, 'Logged out successfully');
});