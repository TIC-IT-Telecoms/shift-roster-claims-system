import bcrypt from 'bcryptjs';
import { User, Employee, Team } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Get own profile (Employee + User combined)
// @route   GET /api/profile/me
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['user_id', 'username', 'role'],
    include: [
      {
        association: 'employee',
        attributes: ['employee_id', 'name', 'email', 'phone', 'hourly_rate', 'status'],//, 'profile_picture'
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['team_id', 'team_name'],
          },
        ],
      },
    ],
  });

  if (!user) {
    logger.warn(`Profile fetch failed: User not found (ID ${req.user.id})`);
    return next(new ErrorResponse('User not found', 404));
  }

  logger.info(`Profile fetched: User ID ${user.user_id}`);

  return successResponse(res, user, 'Profile fetched successfully');
});

// @desc    Update own phone number
// @route   PATCH /api/profile/me/phone
// @access  Private
export const updatePhone = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  const user = await User.findByPk(req.user.id);

  if (!user || !user.employee_id) {
    logger.warn(`Phone update failed: User or employee record not found (User ID ${req.user.id})`);
    return next(new ErrorResponse('Employee record not found', 404));
  }

  const employee = await Employee.findByPk(user.employee_id);

  if (!employee) {
    logger.warn(`Phone update failed: Employee not found (Employee ID ${user.employee_id})`);
    return next(new ErrorResponse('Employee not found', 404));
  }

  employee.phone = phone;
  await employee.save();

  logger.info(`Phone updated: User ID ${user.user_id}`);

  return successResponse(res, { phone: employee.phone }, 'Phone updated successfully');
});

// @desc    Upload or update profile picture
// @route   PATCH /api/profile/me/picture
// @access  Private
// TODO:    Wire up storage provider (S3/Cloudinary/local) when decided
export const updateProfilePicture = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  if (!user || !user.employee_id) {
    logger.warn(`Picture update failed: User or employee record not found (User ID ${req.user.id})`);
    return next(new ErrorResponse('Employee record not found', 404));
  }

  const employee = await Employee.findByPk(user.employee_id);

  if (!employee) {
    logger.warn(`Picture update failed: Employee not found (Employee ID ${user.employee_id})`);
    return next(new ErrorResponse('Employee not found', 404));
  }

  // TODO: Replace with actual file URL from storage provider
  // e.g. req.file.path (multer local) or req.file.location (S3)
  const pictureUrl = req.file?.path || null;

  if (!pictureUrl) {
    return next(new ErrorResponse('No file uploaded', 400));
  }

  employee.profile_picture = pictureUrl;
  await employee.save();

  logger.info(`Profile picture updated: User ID ${user.user_id}`);

  return successResponse(res, { profile_picture: employee.profile_picture }, 'Profile picture updated successfully');
});

// @desc    Change own password (authenticated user)
// @route   PUT /api/profile/me/password
// @access  Private
export const changePassword = asyncHandler(async (req, res, next) => {
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
    logger.warn(`Password change failed: User not found (ID ${req.user.id})`);
    return next(new ErrorResponse('User not found', 404));
  }

  const isMatch = await bcrypt.compare(old_password, user.password_hash);

  if (!isMatch) {
    logger.warn(`Password change failed: incorrect old password for User ID ${user.user_id}`);
    return next(new ErrorResponse('Old password is incorrect', 401));
  }

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(new_password, salt);
  await user.save();

  // Invalidate session by clearing cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  logger.info(`Password changed successfully: User ID ${user.user_id}`);

  return successResponse(res, null, 'Password changed successfully. Please log in again.');
});