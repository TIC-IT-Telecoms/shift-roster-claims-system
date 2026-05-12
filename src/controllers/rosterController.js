import { Op } from 'sequelize';
import {
  Roster, Employee, Shift, Team,
  RotationCycle, RotationDetail, //PublicHoliday,
} from '../models/index.js';
import { sequelize } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import {
  getPublicHolidaySet,
  iterateDateRange,
  resolveCycleDay,
  validateDateRange,
} from '../utils/rosterUtils.js';

// ===== Shared include config =====
const rosterInclude = [
  {
    model: Employee,
    as: 'employee',
    attributes: ['employee_id', 'name', 'email'],
    include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
  },
  {
    model: Shift,
    as: 'shift',
    attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
  },
];

// ===== Build and validate rotation map from a single cycle =====
// Returns { team_id: { day_number: shift_id } }
const buildRotationMap = (cycle, next) => {
  const rotationMap = {};
  const shiftDayMap = {}; // { day_number: { shift_id: team_id } }

  for (const detail of cycle.details) {
    const { team_id, day_number, shift_id } = detail;

    if (!shiftDayMap[day_number]) shiftDayMap[day_number] = {};

    if (shiftDayMap[day_number][shift_id]) {
      throw new ErrorResponse(
        `Cycle "${cycle.cycle_name}" conflict: Shift ID ${shift_id} assigned to ` +
        `more than one team on day ${day_number}. Fix rotation details before generating.`,
        400
      );
    }

    shiftDayMap[day_number][shift_id] = team_id;

    if (!rotationMap[team_id]) rotationMap[team_id] = {};
    rotationMap[team_id][day_number] = shift_id;
  }

  return rotationMap;
};

// @desc    Generate roster from one or multiple rotation cycles
// @route   POST /api/rosters/generate
// @access  Admin
export const generateRoster = asyncHandler(async (req, res, next) => {
  const { rotation_ids, start_date, end_date, default_shift_id } = req.body;

  // Accept single rotation_id or array
  const ids = Array.isArray(rotation_ids)
    ? rotation_ids
    : rotation_ids
    ? [rotation_ids]
    : [];

  if (!ids.length || !start_date || !end_date || !default_shift_id) {
    return next(
      new ErrorResponse(
        'rotation_ids (single or array), start_date, end_date and default_shift_id are required',
        400
      )
    );
  }

  const rangeError = validateDateRange(start_date, end_date);
  if (rangeError) return next(new ErrorResponse(rangeError, 400));

  // Validate default shift
  const defaultShift = await Shift.findByPk(default_shift_id);
  if (!defaultShift) {
    return next(new ErrorResponse('Default shift not found', 404));
  }

  // Load all cycles with their details
  const cycles = await RotationCycle.findAll({
    where: { rotation_id: { [Op.in]: ids } },
    include: [
      {
        model: RotationDetail,
        as: 'details',
        include: [
          { model: Team, as: 'team', attributes: ['team_id', 'team_name'] },
          { model: Shift, as: 'shift', attributes: ['shift_id', 'shift_name'] },
        ],
      },
    ],
  });

  // Verify all requested cycles were found
  if (cycles.length !== ids.length) {
    const foundIds = cycles.map((c) => c.rotation_id);
    const missingIds = ids.filter((id) => !foundIds.includes(Number(id)));
    return next(new ErrorResponse(`Rotation cycles not found: ${missingIds.join(', ')}`, 404));
  }

  // Verify all cycles have details
  for (const cycle of cycles) {
    if (!cycle.details?.length) {
      return next(
        new ErrorResponse(
          `Cycle "${cycle.cycle_name}" has no details defined. ` +
          `Add day/team/shift assignments first.`,
          400
        )
      );
    }
  }

  // Build rotation maps for all cycles
  // Merged map: { team_id: { cycle, rotationMap } }
  // Each team belongs to exactly one cycle
  const teamCycleMap = {}; // { team_id: { cycle, rotationMap } }

  for (const cycle of cycles) {
    let rotationMap;

    try {
      rotationMap = buildRotationMap(cycle);
    } catch (err) {
      return next(err);
    }

    // Check no team appears in more than one cycle
    for (const teamId of Object.keys(rotationMap)) {
      if (teamCycleMap[teamId]) {
        return next(
          new ErrorResponse(
            `Team ID ${teamId} appears in both "${teamCycleMap[teamId].cycle.cycle_name}" ` +
            `and "${cycle.cycle_name}". Each team must belong to exactly one cycle.`,
            400
          )
        );
      }

      teamCycleMap[teamId] = { cycle, rotationMap };
    }
  }

  // Fetch all active employees with their team
  const employees = await Employee.findAll({
    where: { status: 'Active' },
    include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
  });

  if (!employees.length) {
    return next(new ErrorResponse('No active employees found', 404));
  }

  // Fetch public holidays in range
  const holidaySet = await getPublicHolidaySet(start_date, end_date);

  // Fetch existing roster entries to skip
  const existingRosters = await Roster.findAll({
    where: {
      roster_date: { [Op.between]: [start_date, end_date] },
      employee_id: { [Op.in]: employees.map((e) => e.employee_id) },
    },
    attributes: ['employee_id', 'roster_date'],
  });

  const existingSet = new Set(
    existingRosters.map((r) => `${r.employee_id}-${r.roster_date}`)
  );

  // ===== Build roster records =====
  const toInsert = [];
  let skipped = 0;
  let holidayCount = 0;
  let offCount = 0;

  for (const dateStr of iterateDateRange(start_date, end_date)) {
    const isHoliday = holidaySet.has(dateStr);

    for (const employee of employees) {
      const key = `${employee.employee_id}-${dateStr}`;

      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      // Public holiday — use default shift regardless of rotation
      if (isHoliday) {
        toInsert.push({
          employee_id: employee.employee_id,
          shift_id: default_shift_id,
          roster_date: dateStr,
          is_public_holiday: true,
          status: 'Holiday',
        });
        holidayCount++;
        continue;
      }

      const teamId = employee.team_id;
      const teamEntry = teamCycleMap[teamId];

      // Employee has no team or team not in any cycle — mark Off
      if (!teamEntry) {
        toInsert.push({
          employee_id: employee.employee_id,
          shift_id: null,
          roster_date: dateStr,
          is_public_holiday: false,
          status: 'Off',
        });
        offCount++;
        continue;
      }

      const { cycle, rotationMap } = teamEntry;
      const cycleDay = resolveCycleDay(cycle.start_date, cycle.cycle_length, dateStr);

      // Date is before cycle start — mark Off
      if (cycleDay === null) {
        toInsert.push({
          employee_id: employee.employee_id,
          shift_id: null,
          roster_date: dateStr,
          is_public_holiday: false,
          status: 'Off',
        });
        offCount++;
        continue;
      }

      // Resolve shift from this employee's cycle rotation map
      const shiftId = rotationMap[teamId]?.[cycleDay] ?? null;

      toInsert.push({
        employee_id: employee.employee_id,
        shift_id: shiftId,
        roster_date: dateStr,
        is_public_holiday: false,
        status: shiftId ? 'Scheduled' : 'Off',
      });

      if (!shiftId) offCount++;
    }
  }

  // Bulk insert
  await sequelize.transaction(async (t) => {
    await Roster.bulkCreate(toInsert, {
      transaction: t,
      validate: true,
      ignoreDuplicates: true,
    });
  });

  logger.info(
    `Roster generated: Cycles [${ids.join(', ')}] | ` +
    `Range: ${start_date} → ${end_date} | ` +
    `Inserted: ${toInsert.length} | Skipped: ${skipped} | ` +
    `Holidays: ${holidayCount} | Off: ${offCount}`
  );

  return successResponse(
    res,
    {
      rotation_cycles: cycles.map((c) => c.cycle_name),
      date_range: { start_date, end_date },
      total_inserted: toInsert.length,
      total_skipped: skipped,
      holiday_entries: holidayCount,
      off_entries: offCount,
      employees_processed: employees.length,
    },
    'Roster generated successfully',
    201
  );
});

// @desc    Get roster — filterable by team/employee, grouped by date
// @route   GET /api/rosters
// @access  Admin
export const getRosters = asyncHandler(async (req, res, next) => {
  const { start_date, end_date, team_id, employee_id } = req.query;

  if (!start_date || !end_date) {
    return next(new ErrorResponse('start_date and end_date query params are required', 400));
  }

  const rangeError = validateDateRange(start_date, end_date);
  if (rangeError) return next(new ErrorResponse(rangeError, 400));

  const where = { roster_date: { [Op.between]: [start_date, end_date] } };
  if (employee_id) where.employee_id = employee_id;

  const employeeWhere = { status: 'Active' };
  if (team_id) employeeWhere.team_id = team_id;

  const rosters = await Roster.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['employee_id', 'name', 'email'],
        include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
      },
      {
        model: Shift,
        as: 'shift',
        attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
      },
    ],
    order: [
      ['roster_date', 'ASC'],
      [{ model: Employee, as: 'employee' }, 'name', 'ASC'],
    ],
  });

  // Group by date
  const grouped = {};
  for (const entry of rosters) {
    const date = entry.roster_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  logger.info(
    `Rosters fetched: ${start_date} → ${end_date} | ` +
    `${rosters.length} entries | team_id: ${team_id ?? 'all'}`
  );

  return successResponse(
    res,
    { date_range: { start_date, end_date }, total: rosters.length, roster: grouped },
    'Roster fetched successfully'
  );
});

// @desc    Get single employee roster
// @route   GET /api/rosters/employee/:employee_id
// @access  Admin
export const getEmployeeRoster = asyncHandler(async (req, res, next) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return next(new ErrorResponse('start_date and end_date query params are required', 400));
  }

  const rangeError = validateDateRange(start_date, end_date);
  if (rangeError) return next(new ErrorResponse(rangeError, 400));

  const employee = await Employee.findByPk(req.params.employee_id, {
    include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
  });

  if (!employee) {
    return next(new ErrorResponse('Employee not found', 404));
  }

  const rosters = await Roster.findAll({
    where: {
      employee_id: req.params.employee_id,
      roster_date: { [Op.between]: [start_date, end_date] },
    },
    include: [
      {
        model: Shift,
        as: 'shift',
        attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
      },
    ],
    order: [['roster_date', 'ASC']],
  });

  logger.info(
    `Employee roster fetched: ID ${req.params.employee_id} | ` +
    `${start_date} → ${end_date} | ${rosters.length} entries`
  );

  return successResponse(
    res,
    {
      employee: {
        employee_id: employee.employee_id,
        name: employee.name,
        team: employee.team,
      },
      date_range: { start_date, end_date },
      total: rosters.length,
      roster: rosters,
    },
    'Employee roster fetched successfully'
  );
});

// @desc    Get own roster (employee view)
// @route   GET /api/rosters/me
// @access  Private
export const getMyRoster = asyncHandler(async (req, res, next) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return next(new ErrorResponse('start_date and end_date query params are required', 400));
  }

  const rangeError = validateDateRange(start_date, end_date);
  if (rangeError) return next(new ErrorResponse(rangeError, 400));

  const user = await sequelize.models.User.findByPk(req.user.id, {
    attributes: ['user_id', 'employee_id'],
  });

  if (!user?.employee_id) {
    return next(new ErrorResponse('Employee record not found for this user', 404));
  }

  const rosters = await Roster.findAll({
    where: {
      employee_id: user.employee_id,
      roster_date: { [Op.between]: [start_date, end_date] },
    },
    include: [
      {
        model: Shift,
        as: 'shift',
        attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
      },
    ],
    order: [['roster_date', 'ASC']],
  });

  logger.info(
    `My roster fetched: User ID ${req.user.id} | ` +
    `${start_date} → ${end_date} | ${rosters.length} entries`
  );

  return successResponse(
    res,
    { date_range: { start_date, end_date }, total: rosters.length, roster: rosters },
    'Your roster fetched successfully'
  );
});

// @desc    Update a single roster entry
// @route   PATCH /api/rosters/:id
// @access  Admin
export const updateRosterEntry = asyncHandler(async (req, res, next) => {
  const { shift_id, status } = req.body;

  const entry = await Roster.findByPk(req.params.id, { include: rosterInclude });

  if (!entry) {
    logger.warn(`Roster update failed: entry not found (ID ${req.params.id})`);
    return next(new ErrorResponse('Roster entry not found', 404));
  }

  const validStatuses = ['Scheduled', 'Off', 'Holiday'];
  if (status && !validStatuses.includes(status)) {
    return next(
      new ErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    );
  }

  if (shift_id) {
    const shift = await Shift.findByPk(shift_id);
    if (!shift) return next(new ErrorResponse('Shift not found', 404));
  }

  await entry.update({
    shift_id: shift_id !== undefined ? shift_id : entry.shift_id,
    status: status ?? entry.status,
  });

  logger.info(`Roster entry updated: ID ${entry.roster_id} | Employee ID ${entry.employee_id}`);

  return successResponse(res, entry, 'Roster entry updated successfully');
});

// @desc    Delete roster entries for a date range
// @route   DELETE /api/rosters
// @access  Admin
export const deleteRosterRange = asyncHandler(async (req, res, next) => {
  const { start_date, end_date, team_id } = req.body;

  if (!start_date || !end_date) {
    return next(new ErrorResponse('start_date and end_date are required', 400));
  }

  const rangeError = validateDateRange(start_date, end_date);
  if (rangeError) return next(new ErrorResponse(rangeError, 400));

  const where = { roster_date: { [Op.between]: [start_date, end_date] } };

  if (team_id) {
    const teamEmployees = await Employee.findAll({
      where: { team_id, status: 'Active' },
      attributes: ['employee_id'],
    });

    if (!teamEmployees.length) {
      return next(new ErrorResponse('No active employees found for this team', 404));
    }

    where.employee_id = { [Op.in]: teamEmployees.map((e) => e.employee_id) };
  }

  const deleted = await Roster.destroy({ where });

  logger.info(
    `Roster deleted: ${start_date} → ${end_date} | ` +
    `team_id: ${team_id ?? 'all'} | ${deleted} entries removed`
  );

  return successResponse(
    res,
    { deleted_count: deleted, date_range: { start_date, end_date } },
    'Roster entries deleted successfully'
  );
});