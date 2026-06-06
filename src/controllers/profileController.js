import bcrypt from 'bcryptjs';
import { User, Employee, Team } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Get own profile
// @route   GET /api/profile/me
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['user_id', 'username', 'role', 'created_at', 'last_login'],
    include: [
      {
        association: 'employee',
        attributes: [
          'employee_id', 'name', 'email', 'phone', 'hourly_rate', 'status',
          'role', 'employment_type', 'id_number', 'address', 'created_at', //'profile_picture',
        ],
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['team_id', 'team_name'],
          },
          {
            model: Employee,
            as: 'supervisor',
            attributes: ['employee_id', 'name', 'role'],
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

// ===== Helper: resolve employee from authenticated user =====
const resolveEmployeeFromUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user?.employee_id) return null;
  return Employee.findByPk(user.employee_id);
};

// @desc    Update own phone number
// @route   PATCH /api/profile/me/phone
// @access  Private
export const updatePhone = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  const employee = await resolveEmployeeFromUser(req.user.id);

  if (!employee) {
    return next(new ErrorResponse('Employee record not found', 404));
  }

  employee.phone = phone;
  await employee.save();

  logger.info(`Phone updated: User ID ${req.user.id}`);

  return successResponse(res, { phone: employee.phone }, 'Phone updated successfully');
});

// @desc    Update own address
// @route   PATCH /api/profile/me/address
// @access  Private
export const updateAddress = asyncHandler(async (req, res, next) => {
  const { address } = req.body;

  if (!address || !address.trim()) {
    return next(new ErrorResponse('Address is required', 400));
  }

  const employee = await resolveEmployeeFromUser(req.user.id);

  if (!employee) {
    return next(new ErrorResponse('Employee record not found', 404));
  }

  employee.address = address.trim();
  await employee.save();

  logger.info(`Address updated: User ID ${req.user.id}`);

  return successResponse(res, { address: employee.address }, 'Address updated successfully');
});

// @desc    Upload or update profile picture
// @route   PATCH /api/profile/me/picture
// @access  Private
// TODO: Wire up storage provider when decided
export const updateProfilePicture = asyncHandler(async (req, res, next) => {
  const employee = await resolveEmployeeFromUser(req.user.id);

  if (!employee) {
    return next(new ErrorResponse('Employee record not found', 404));
  }

  const pictureUrl = req.file?.path || null;

  if (!pictureUrl) {
    return next(new ErrorResponse('No file uploaded', 400));
  }

  employee.profile_picture = pictureUrl;
  await employee.save();

  logger.info(`Profile picture updated: User ID ${req.user.id}`);

  return successResponse(
    res,
    { profile_picture: employee.profile_picture },
    'Profile picture updated successfully'
  );
});

// @desc    Change own password
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

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  logger.info(`Password changed: User ID ${user.user_id}`);

  return successResponse(res, null, 'Password changed successfully. Please log in again.');
});