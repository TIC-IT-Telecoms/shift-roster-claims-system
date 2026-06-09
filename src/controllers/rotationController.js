import { Op } from 'sequelize';
import { RotationCycle, RotationDetail, Team, Shift } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { resolveCurrentDay, isCycleActive, getActiveCycles,
  validateDetails, checkCycleOverlap } from '../utils/rotationUtils.js';

const detailInclude = [
  {
    model: RotationDetail,
    as: 'details',
    include: [
      { model: Team, as: 'team', attributes: ['team_id', 'team_name'] },
      {
        model: Shift,
        as: 'shift',
        attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
      },
    ],
    order: [['day_number', 'ASC']],
    separate: true,
  },
];

// @desc    Create rotation cycle with full details
// @route   POST /api/rotations
// @access  Admin
export const createRotationCycle = asyncHandler(async (req, res, next) => {
  const { cycle_name, cycle_length, description, start_date, details } = req.body;

  if (!cycle_name || !cycle_length || !start_date) {
    return next(new ErrorResponse('cycle name, cycle length and start date are required', 400));
  }

  if (!Number.isInteger(Number(cycle_length)) || Number(cycle_length) < 1) {
    return next(new ErrorResponse('cycle length must be a positive integer', 400));
  }

  // Validate start_date format
  if (isNaN(Date.parse(start_date))) {
    return next(new ErrorResponse('start date must be a valid date (YYYY-MM-DD)', 400));
  }

  const existing = await RotationCycle.findOne({ where: { cycle_name: cycle_name.trim() } });
  if (existing) {
    logger.warn(`Rotation creation failed: name already exists (${cycle_name})`);
    return next(new ErrorResponse('Rotation cycle name already exists', 400));
  }

  // Check for overlapping active cycles — warn but allow
  const overlapping = await checkCycleOverlap(start_date);
  let warning = null;

  if (overlapping.length) {
    const names = overlapping.map((c) => c.cycle_name).join(', ');
    warning = `This cycle will run simultaneously with: ${names}`;
    logger.warn(`Rotation overlap warning: new cycle "${cycle_name}" overlaps with [${names}]`);
  }

  const result = await sequelize.transaction(async (t) => {
    const cycle = await RotationCycle.create(
      {
        cycle_name: cycle_name.trim(),
        cycle_length: Number(cycle_length),
        description: description?.trim() || null,
        start_date,
      },
      { transaction: t }
    );

    let createdDetails = [];

    if (details?.length) {
      await validateDetails(details, Number(cycle_length), t);

      const detailRecords = details.map(({ day_number, team_id, shift_id }) => ({
        rotation_id: cycle.rotation_id,
        day_number: Number(day_number),
        team_id,
        shift_id,
      }));

      createdDetails = await RotationDetail.bulkCreate(detailRecords, {
        transaction: t,
        validate: true,
      });
    }

    return { cycle, details: createdDetails };
  });

  logger.info(
    `Rotation cycle created: ID ${result.cycle.rotation_id} | ` +
    `length: ${cycle_length} days | entries: ${result.details.length}`
  );

  return successResponse(
    res,
    { ...result, warning },
    warning ? 'Rotation cycle created with warning' : 'Rotation cycle created successfully',
    201
  );
});

// @desc    Get all rotation cycles
// @route   GET /api/rotations
// @access  Admin
export const getRotationCycles = asyncHandler(async (req, res, next) => {
  const cycles = await RotationCycle.findAll({
    include: detailInclude,
    order: [['start_date', 'DESC']],
  });

  // Annotate each cycle with active status and current day
  const annotated = cycles.map((cycle) => {
    const plain = cycle.toJSON();
    const active = isCycleActive(cycle.start_date);
    const currentDay = active ? resolveCurrentDay(cycle.start_date, cycle.cycle_length) : null;
    return { ...plain, is_active: active, current_day: currentDay };
  });

  logger.info(`Rotation cycles fetched: ${cycles.length} records`);

  return successResponse(res, annotated, 'Rotation cycles fetched successfully');
});

// @desc    Get single rotation cycle
// @route   GET /api/rotations/:id
// @access  Admin
export const getRotationCycleById = asyncHandler(async (req, res, next) => {
  const cycle = await RotationCycle.findByPk(req.params.id, { include: detailInclude });

  if (!cycle) {
    logger.warn(`Rotation cycle not found: ID ${req.params.id}`);
    return next(new ErrorResponse('Rotation cycle not found', 404));
  }

  const active = isCycleActive(cycle.start_date);
  const currentDay = active ? resolveCurrentDay(cycle.start_date, cycle.cycle_length) : null;

  logger.info(`Rotation cycle fetched: ID ${cycle.rotation_id}`);

  return successResponse(
    res,
    { ...cycle.toJSON(), is_active: active, current_day: currentDay },
    'Rotation cycle fetched successfully'
  );
});

// @desc    Get current active day and assignments for a cycle
// @route   GET /api/rotations/:id/current-day
// @access  Admin
export const getCurrentCycleDay = asyncHandler(async (req, res, next) => {
  const cycle = await RotationCycle.findByPk(req.params.id, { include: detailInclude });

  if (!cycle) {
    logger.warn(`Current day fetch failed: Rotation cycle not found (${req.params.id})`);
    return next(new ErrorResponse('Rotation cycle not found', 404));
  }

  if (!isCycleActive(cycle.start_date)) {
    return next(
      new ErrorResponse(
        `Rotation cycle has not started yet. Starts on ${cycle.start_date}`,
        400
      )
    );
  }

  const currentDay = resolveCurrentDay(cycle.start_date, cycle.cycle_length);
  const todayAssignments = cycle.details.filter((d) => d.day_number === currentDay);

  logger.info(`Current day resolved: Cycle ID ${cycle.rotation_id} → Day ${currentDay}`);

  return successResponse(
    res,
    {
      cycle_id: cycle.rotation_id,
      cycle_name: cycle.cycle_name,
      cycle_length: cycle.cycle_length,
      start_date: cycle.start_date,
      current_day: currentDay,
      total_assignments_today: todayAssignments.length,
      assignments: todayAssignments,
    },
    `Active — Day ${currentDay} of ${cycle.cycle_length}`
  );
});

// @desc    Get all currently active cycles with today's assignments
// @route   GET /api/rotations/active
// @access  Admin
export const getActiveCyclesForToday = asyncHandler(async (req, res, next) => {
  const cycles = await getActiveCycles();

  if (!cycles.length) {
    return successResponse(res, [], 'No active rotation cycles found for today');
  }

  const result = cycles.map((cycle) => {
    const currentDay = resolveCurrentDay(cycle.start_date, cycle.cycle_length);
    const todayAssignments = cycle.details.filter((d) => d.day_number === currentDay);

    return {
      cycle_id: cycle.rotation_id,
      cycle_name: cycle.cycle_name,
      cycle_length: cycle.cycle_length,
      start_date: cycle.start_date,
      current_day: currentDay,
      assignments: todayAssignments,
    };
  });

  logger.info(`Active cycles fetched for today: ${result.length} cycles`);

  return successResponse(res, result, 'Active rotation cycles for today');
});

// @desc    Update cycle metadata
// @route   PUT /api/rotations/:id
// @access  Admin
export const updateRotationCycle = asyncHandler(async (req, res, next) => {
  const { cycle_name, cycle_length, description, start_date } = req.body;

  const cycle = await RotationCycle.findByPk(req.params.id);

  if (!cycle) {
    logger.warn(`Update failed: Rotation cycle not found (${req.params.id})`);
    return next(new ErrorResponse('Rotation cycle not found', 404));
  }

  if (cycle_name && cycle_name.trim() !== cycle.cycle_name) {
    const existing = await RotationCycle.findOne({ where: { cycle_name: cycle_name.trim() } });
    if (existing) {
      logger.warn(`Update failed: Cycle name already exists (${cycle_name})`);
      return next(new ErrorResponse('Rotation cycle name already exists', 400));
    }
  }

  const newLength = cycle_length ? Number(cycle_length) : cycle.cycle_length;

  // Block length reduction if existing details would fall out of range
  if (cycle_length && newLength < cycle.cycle_length) {
    const outOfRange = await RotationDetail.count({
      where: {
        rotation_id: cycle.rotation_id,
        day_number: { [Op.gt]: newLength },
      },
    });

    if (outOfRange > 0) {
      return next(
        new ErrorResponse(
          `Cannot reduce cycle_length to ${newLength} — ` +
          `${outOfRange} detail entries exceed this range. Remove them first.`,
          400
        )
      );
    }
  }

  let warning = null;
  if (start_date && start_date !== cycle.start_date) {
    if (isNaN(Date.parse(start_date))) {
      return next(new ErrorResponse('start_date must be a valid date (YYYY-MM-DD)', 400));
    }

    const overlapping = await checkCycleOverlap(start_date, cycle.rotation_id);
    if (overlapping.length) {
      const names = overlapping.map((c) => c.cycle_name).join(', ');
      warning = `This cycle will run simultaneously with: ${names}`;
      logger.warn(`Rotation update overlap warning: [${names}]`);
    }
  }

  await cycle.update({
    cycle_name: cycle_name ? cycle_name.trim() : cycle.cycle_name,
    cycle_length: newLength,
    description: description !== undefined ? description?.trim() || null : cycle.description,
    start_date: start_date ?? cycle.start_date,
  });

  logger.info(`Rotation cycle updated: ID ${cycle.rotation_id}`);

  return successResponse(
    res,
    { ...cycle.toJSON(), warning },
    warning ? 'Rotation cycle updated with warning' : 'Rotation cycle updated successfully'
  );
});

// @desc    Replace all details for a cycle
// @route   PUT /api/rotations/:id/details
// @access  Admin
export const updateRotationDetails = asyncHandler(async (req, res, next) => {
  const { details } = req.body;

  const cycle = await RotationCycle.findByPk(req.params.id);

  if (!cycle) {
    logger.warn(`Details update failed: Rotation cycle not found (${req.params.id})`);
    return next(new ErrorResponse('Rotation cycle not found', 404));
  }

  await sequelize.transaction(async (t) => {
    await validateDetails(details, cycle.cycle_length, t);

    await RotationDetail.destroy({
      where: { rotation_id: cycle.rotation_id },
      transaction: t,
    });

    const detailRecords = details.map(({ day_number, team_id, shift_id }) => ({
      rotation_id: cycle.rotation_id,
      day_number: Number(day_number),
      team_id,
      shift_id,
    }));

    await RotationDetail.bulkCreate(detailRecords, { transaction: t, validate: true });
  });

  logger.info(
    `Rotation details replaced: Cycle ID ${cycle.rotation_id} | ${details.length} entries`
  );

  return successResponse(res, null, 'Rotation details updated successfully');
});

// @desc    Delete rotation cycle and all its details
// @route   DELETE /api/rotations/:id
// @access  Admin
export const deleteRotationCycle = asyncHandler(async (req, res, next) => {
  const cycle = await RotationCycle.findByPk(req.params.id);

  if (!cycle) {
    logger.warn(`Delete failed: Rotation cycle not found (${req.params.id})`);
    return next(new ErrorResponse('Rotation cycle not found', 404));
  }

  // Block deletion of active cycles — must have a deliberate deactivation step
  if (isCycleActive(cycle.start_date)) {
    const currentDay = resolveCurrentDay(cycle.start_date, cycle.cycle_length);
    logger.warn(`Delete blocked: Cycle ID ${cycle.rotation_id} is currently active (Day ${currentDay})`);
    return next(
      new ErrorResponse(
        `Cannot delete an active rotation cycle (currently on Day ${currentDay}). ` +
        `Update the start date to a future date first.`,
        400
      )
    );
  }

  await sequelize.transaction(async (t) => {
    await RotationDetail.destroy({ where: { rotation_id: cycle.rotation_id }, transaction: t });
    await cycle.destroy({ transaction: t });
  });

  logger.info(`Rotation cycle deleted: ID ${cycle.rotation_id} | name: ${cycle.cycle_name}`);

  return successResponse(res, null, 'Rotation cycle deleted successfully');
});