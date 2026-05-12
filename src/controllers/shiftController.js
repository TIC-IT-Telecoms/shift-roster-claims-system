import { Shift } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Shift time boundaries — single source of truth
const SHIFT_WINDOWS = {
  early: { start: '06:00:00', end: '14:00:00' },
  night: { start: '14:00:00', end: '22:00:00' },
  grave: { start: '22:00:00', end: '06:00:00' },
};

// Validate that start/end times match one of the 3 defined shift windows
const validateShiftTimes = (start_time, end_time, is_grave) => {
  const match = Object.values(SHIFT_WINDOWS).find(
    (w) => w.start === start_time && w.end === end_time
  );

  if (!match) {
    return 'Invalid shift times. Allowed windows: Early (06:00-14:00), Night (14:00-22:00), Grave (22:00-06:00)';
  }

  // Grave shift must cross midnight — flag must be true
  const isGraveWindow = start_time === SHIFT_WINDOWS.grave.start && end_time === SHIFT_WINDOWS.grave.end;

  if (isGraveWindow && !is_grave) {
    return 'is_grave must be true for grave shift (22:00-06:00)';
  }

  if (!isGraveWindow && is_grave) {
    return 'is_grave can only be true for grave shift (22:00-06:00)';
  }

  return null;
};

// Normalize time to HH:MM:SS for consistent comparison
const normalizeTime = (time) => {
  if (!time) return null;
  // Accept HH:MM or HH:MM:SS
  return time.length === 5 ? `${time}:00` : time;
};

// @desc    Create shift
// @route   POST /api/shifts
// @access  Admin
export const createShift = asyncHandler(async (req, res, next) => {
  const { shift_name, start_time, end_time, is_grave = false, description } = req.body;

  if (!shift_name || !start_time || !end_time) {
    return next(new ErrorResponse('shift_name, start_time and end_time are required', 400));
  }

  const normalizedStart = normalizeTime(start_time);
  const normalizedEnd = normalizeTime(end_time);

  const validationError = validateShiftTimes(normalizedStart, normalizedEnd, is_grave);

  if (validationError) {
    logger.warn(`Shift creation failed: ${validationError}`);
    return next(new ErrorResponse(validationError, 400));
  }

  // Prevent duplicate shift names
  const existing = await Shift.findOne({ where: { shift_name: shift_name.trim() } });

  if (existing) {
    logger.warn(`Shift creation failed: name already exists (${shift_name})`);
    return next(new ErrorResponse('Shift name already exists', 400));
  }

  const shift = await Shift.create({
    shift_name: shift_name.trim(),
    start_time: normalizedStart,
    end_time: normalizedEnd,
    is_grave,
    description: description?.trim() || null,
  });

  logger.info(`Shift created: ID ${shift.shift_id} | name: ${shift.shift_name}`);

  return successResponse(res, shift, 'Shift created successfully', 201);
});

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  All authenticated users
export const getShifts = asyncHandler(async (req, res, next) => {
  const shifts = await Shift.findAll({
    order: [['start_time', 'ASC']],
  });

  logger.info('Shifts fetched successfully');

  return successResponse(res, shifts, 'Shifts fetched successfully');
});

// @desc    Get single shift
// @route   GET /api/shifts/:id
// @access  All authenticated users
export const getShiftById = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findByPk(req.params.id);

  if (!shift) {
    logger.warn(`Shift not found: ID ${req.params.id}`);
    return next(new ErrorResponse('Shift not found', 404));
  }

  logger.info(`Shift fetched: ID ${shift.shift_id}`);

  return successResponse(res, shift, 'Shift fetched successfully');
});

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Admin
export const updateShift = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findByPk(req.params.id);

  if (!shift) {
    logger.warn(`Update failed: Shift not found (${req.params.id})`);
    return next(new ErrorResponse('Shift not found', 404));
  }

  const {
    shift_name, start_time, end_time,
    is_grave, description,
  } = req.body;

  // Use existing values as fallback for partial updates
  const updatedStart = normalizeTime(start_time) ?? shift.start_time;
  const updatedEnd = normalizeTime(end_time) ?? shift.end_time;
  const updatedIsGrave = is_grave !== undefined ? is_grave : shift.is_grave;

  const validationError = validateShiftTimes(updatedStart, updatedEnd, updatedIsGrave);

  if (validationError) {
    logger.warn(`Shift update failed: ${validationError}`);
    return next(new ErrorResponse(validationError, 400));
  }

  // Check name collision only if name is being changed
  if (shift_name && shift_name.trim() !== shift.shift_name) {
    const existing = await Shift.findOne({ where: { shift_name: shift_name.trim() } });

    if (existing) {
      logger.warn(`Update failed: Shift name already exists (${shift_name})`);
      return next(new ErrorResponse('Shift name already exists', 400));
    }
  }

  await shift.update({
    shift_name: shift_name ? shift_name.trim() : shift.shift_name,
    start_time: updatedStart,
    end_time: updatedEnd,
    is_grave: updatedIsGrave,
    description: description !== undefined ? description?.trim() || null : shift.description,
  });

  logger.info(`Shift updated: ID ${shift.shift_id}`);

  return successResponse(res, shift, 'Shift updated successfully');
});

// @desc    Delete shift
// @route   DELETE /api/shifts/:id
// @access  Admin
export const deleteShift = asyncHandler(async (req, res, next) => {
  const shift = await Shift.findByPk(req.params.id);

  if (!shift) {
    logger.warn(`Delete failed: Shift not found (${req.params.id})`);
    return next(new ErrorResponse('Shift not found', 404));
  }

  await shift.destroy();

  logger.info(`Shift deleted: ID ${shift.shift_id} | name: ${shift.shift_name}`);

  return successResponse(res, null, 'Shift deleted successfully');
});