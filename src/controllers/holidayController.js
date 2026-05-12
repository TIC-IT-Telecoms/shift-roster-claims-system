import { Op } from 'sequelize';
import { PublicHoliday } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Add public holiday
// @route   POST /api/holidays
// @access  Admin
export const createHoliday = asyncHandler(async (req, res, next) => {
  const { holiday_date, holiday_name, description } = req.body;

  if (!holiday_date || !holiday_name) {
    return next(new ErrorResponse('holiday_date and holiday_name are required', 400));
  }

  // Validate date format
  if (isNaN(Date.parse(holiday_date))) {
    return next(new ErrorResponse('holiday_date must be a valid date (YYYY-MM-DD)', 400));
  }

  // Prevent duplicate dates
  const existing = await PublicHoliday.findOne({ where: { holiday_date } });
  if (existing) {
    logger.warn(`Holiday creation failed: date already exists (${holiday_date})`);
    return next(
      new ErrorResponse(
        `A holiday already exists on ${holiday_date}: "${existing.holiday_name}"`,
        400
      )
    );
  }

  const holiday = await PublicHoliday.create({
    holiday_date,
    holiday_name: holiday_name.trim(),
    description: description?.trim() || null,
  });

  logger.info(`Holiday created: ${holiday.holiday_name} on ${holiday.holiday_date}`);

  return successResponse(res, holiday, 'Public holiday created successfully', 201);
});

// @desc    Bulk add public holidays (e.g. full year import)
// @route   POST /api/holidays/bulk
// @access  Admin
export const bulkCreateHolidays = asyncHandler(async (req, res, next) => {
  const { holidays } = req.body;

  if (!Array.isArray(holidays) || !holidays.length) {
    return next(new ErrorResponse('holidays array is required and must not be empty', 400));
  }

  // Validate each entry
  const seen = new Set();
  for (const { holiday_date, holiday_name } of holidays) {
    if (!holiday_date || !holiday_name) {
      return next(
        new ErrorResponse('Each holiday must include holiday_date and holiday_name', 400)
      );
    }

    if (isNaN(Date.parse(holiday_date))) {
      return next(
        new ErrorResponse(`Invalid date format: ${holiday_date}. Use YYYY-MM-DD`, 400)
      );
    }

    // Check duplicates within the submission itself
    if (seen.has(holiday_date)) {
      return next(
        new ErrorResponse(`Duplicate date in submission: ${holiday_date}`, 400)
      );
    }
    seen.add(holiday_date);
  }

  // Check against existing DB records
  const dates = holidays.map((h) => h.holiday_date);
  const existingHolidays = await PublicHoliday.findAll({
    where: { holiday_date: { [Op.in]: dates } },
    attributes: ['holiday_date', 'holiday_name'],
  });

  if (existingHolidays.length) {
    const conflicts = existingHolidays
      .map((h) => `${h.holiday_date} (${h.holiday_name})`)
      .join(', ');
    return next(
      new ErrorResponse(`Holidays already exist for: ${conflicts}`, 400)
    );
  }

  const records = holidays.map(({ holiday_date, holiday_name, description }) => ({
    holiday_date,
    holiday_name: holiday_name.trim(),
    description: description?.trim() || null,
  }));

  const created = await PublicHoliday.bulkCreate(records, { validate: true });

  logger.info(`Bulk holidays created: ${created.length} entries`);

  return successResponse(
    res,
    { total_created: created.length, holidays: created },
    'Public holidays created successfully',
    201
  );
});

// @desc    Get all public holidays — filterable by year
// @route   GET /api/holidays
// @access  All authenticated users
export const getHolidays = asyncHandler(async (req, res, next) => {
  const { year } = req.query;

  const where = {};

  if (year) {
    if (isNaN(Number(year)) || String(year).length !== 4) {
      return next(new ErrorResponse('year must be a valid 4-digit year', 400));
    }

    where.holiday_date = {
      [Op.between]: [`${year}-01-01`, `${year}-12-31`],
    };
  }

  const holidays = await PublicHoliday.findAll({
    where,
    order: [['holiday_date', 'ASC']],
  });

  logger.info(`Holidays fetched: ${holidays.length} records | year: ${year ?? 'all'}`);

  return successResponse(res, holidays, 'Public holidays fetched successfully');
});

// @desc    Get single public holiday
// @route   GET /api/holidays/:id
// @access  All authenticated users
export const getHolidayById = asyncHandler(async (req, res, next) => {
  const holiday = await PublicHoliday.findByPk(req.params.id);

  if (!holiday) {
    logger.warn(`Holiday not found: ID ${req.params.id}`);
    return next(new ErrorResponse('Public holiday not found', 404));
  }

  logger.info(`Holiday fetched: ID ${holiday.holiday_id}`);

  return successResponse(res, holiday, 'Public holiday fetched successfully');
});

// @desc    Check if a specific date is a public holiday
// @route   GET /api/holidays/check/:date
// @access  All authenticated users
export const checkHolidayByDate = asyncHandler(async (req, res, next) => {
  const { date } = req.params;

  if (isNaN(Date.parse(date))) {
    return next(new ErrorResponse('date must be a valid date (YYYY-MM-DD)', 400));
  }

  const holiday = await PublicHoliday.findOne({ where: { holiday_date: date } });

  logger.info(`Holiday check: ${date} → ${holiday ? holiday.holiday_name : 'Not a holiday'}`);

  return successResponse(
    res,
    {
      date,
      is_holiday: !!holiday,
      holiday: holiday ?? null,
    },
    holiday ? `${date} is a public holiday: ${holiday.holiday_name}` : `${date} is not a public holiday`
  );
});

// @desc    Update public holiday
// @route   PUT /api/holidays/:id
// @access  Admin
export const updateHoliday = asyncHandler(async (req, res, next) => {
  const { holiday_date, holiday_name, description } = req.body;

  const holiday = await PublicHoliday.findByPk(req.params.id);

  if (!holiday) {
    logger.warn(`Holiday update failed: not found (ID ${req.params.id})`);
    return next(new ErrorResponse('Public holiday not found', 404));
  }

  // Check date collision only if date is being changed
  if (holiday_date && holiday_date !== holiday.holiday_date) {
    if (isNaN(Date.parse(holiday_date))) {
      return next(new ErrorResponse('holiday_date must be a valid date (YYYY-MM-DD)', 400));
    }

    const existing = await PublicHoliday.findOne({ where: { holiday_date } });
    if (existing) {
      logger.warn(`Holiday update failed: date already exists (${holiday_date})`);
      return next(
        new ErrorResponse(
          `A holiday already exists on ${holiday_date}: "${existing.holiday_name}"`,
          400
        )
      );
    }
  }

  await holiday.update({
    holiday_date: holiday_date ?? holiday.holiday_date,
    holiday_name: holiday_name ? holiday_name.trim() : holiday.holiday_name,
    description: description !== undefined ? description?.trim() || null : holiday.description,
  });

  logger.info(`Holiday updated: ID ${holiday.holiday_id} | ${holiday.holiday_name}`);

  return successResponse(res, holiday, 'Public holiday updated successfully');
});

// @desc    Delete public holiday
// @route   DELETE /api/holidays/:id
// @access  Admin
export const deleteHoliday = asyncHandler(async (req, res, next) => {
  const holiday = await PublicHoliday.findByPk(req.params.id);

  if (!holiday) {
    logger.warn(`Holiday delete failed: not found (ID ${req.params.id})`);
    return next(new ErrorResponse('Public holiday not found', 404));
  }

  await holiday.destroy();

  logger.info(`Holiday deleted: ${holiday.holiday_name} on ${holiday.holiday_date}`);

  return successResponse(res, null, 'Public holiday deleted successfully');
});