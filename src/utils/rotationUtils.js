// utils/rotationUtils.js — merged and consolidated
import { Op } from 'sequelize';
import { RotationCycle, RotationDetail, Team, Shift, PublicHoliday } from '../models/index.js';
import { ErrorResponse } from './ErrorResponse.js';

// ===================================================
// ===== CYCLE DAY RESOLUTION =====
// ===================================================

/**
 * Resolve which cycle day number applies to a given date.
 * Auto-loops: when cycle completes it wraps back to day 1.
 * Returns null if targetDate is before startDate.
 *
 * Used by: rotationController, rosterController, rosterUtils
 */
export const resolveCycleDay = (startDate, cycleLength, targetDate = new Date()) => {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  return (diffDays % cycleLength) + 1;
};

// Alias — keeps rotationController imports working without change
export const resolveCurrentDay = resolveCycleDay;

// ===================================================
// ===== CYCLE STATUS =====
// ===================================================

/**
 * Check if a cycle is currently active based on its start_date.
 * A cycle is active when today >= start_date.
 */
export const isCycleActive = (startDate, targetDate = new Date()) => {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target >= start;
};

/**
 * Get all currently active rotation cycles with full detail includes.
 */
export const getActiveCycles = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return RotationCycle.findAll({
    where: { start_date: { [Op.lte]: today } },
    include: [
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
        separate: true,
        order: [['day_number', 'ASC']],
      },
    ],
  });
};

/**
 * Check for active cycles that overlap with a proposed start_date.
 * Returns overlapping cycles — caller decides whether to warn or block.
 * Pass excludeId to ignore the current cycle when updating.
 */
export const checkCycleOverlap = async (startDate, excludeId = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = { start_date: { [Op.lte]: today } };
  if (excludeId) where.rotation_id = { [Op.ne]: excludeId };

  return RotationCycle.findAll({
    where,
    attributes: ['rotation_id', 'cycle_name', 'start_date'],
  });
};

// ===================================================
// ===== DETAIL VALIDATION =====
// ===================================================

/**
 * Validate rotation detail entries before DB insert.
 * Enforces:
 *   1. Each entry has day_number, team_id, shift_id
 *   2. day_number is within cycle length range
 *   3. One team per day (no duplicate team on same day)
 *   4. One team per shift per day (no two teams on same shift same day)
 *   5. Team and Shift exist in the DB
 */
export const validateDetails = async (details, cycleLength, transaction) => {
  if (!Array.isArray(details) || !details.length) {
    throw new ErrorResponse('details array is required', 400);
  }

  const seenTeam = new Set();  // `${day_number}-${team_id}`
  const seenShift = new Set(); // `${day_number}-${shift_id}`

  for (const { day_number, team_id, shift_id } of details) {
    if (!day_number || !team_id || !shift_id) {
      throw new ErrorResponse(
        'Each detail entry must include day_number, team_id and shift_id',
        400
      );
    }

    const dayNum = Number(day_number);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > cycleLength) {
      throw new ErrorResponse(
        `day_number ${day_number} is out of range — must be between 1 and ${cycleLength}`,
        400
      );
    }

    const teamKey = `${dayNum}-${team_id}`;
    if (seenTeam.has(teamKey)) {
      throw new ErrorResponse(
        `Duplicate entry: Team ID ${team_id} assigned more than once on day ${dayNum}`,
        400
      );
    }
    seenTeam.add(teamKey);

    const shiftKey = `${dayNum}-${shift_id}`;
    if (seenShift.has(shiftKey)) {
      throw new ErrorResponse(
        `Shift ID ${shift_id} already assigned to another team on day ${dayNum}. ` +
        `Only one team is allowed per shift per day.`,
        400
      );
    }
    seenShift.add(shiftKey);

    const team = await Team.findByPk(team_id, { transaction });
    if (!team) throw new ErrorResponse(`Team not found: ID ${team_id}`, 404);

    const shift = await Shift.findByPk(shift_id, { transaction });
    if (!shift) throw new ErrorResponse(`Shift not found: ID ${shift_id}`, 404);
  }
};

// ===================================================
// ===== TIME HELPERS =====
// ===================================================

/**
 * Normalize HH:MM to HH:MM:SS for DB comparison.
 * normalizeTime("06:00") → "06:00:00"
 */
export const normalizeTime = (time) => {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
};

// ===================================================
// ===== DATE RANGE =====
// ===================================================

/**
 * Validate a date range.
 * Returns an error string or null if valid.
 * Max range: 3 months (92 days).
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'start_date and end_date must be valid dates (YYYY-MM-DD)';
  }

  if (end < start) {
    return 'end_date must be after start_date';
  }

  const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));

  if (diffDays > 92) {
    return 'Date range cannot exceed 3 months per generation run';
  }

  return null;
};

/**
 * Generator — yields every YYYY-MM-DD string in [startDate, endDate] inclusive.
 * Memory-efficient: yields one date at a time, no array built.
 */
export const iterateDateRange = function* (startDate, endDate) {
  const current = new Date(startDate);
  const end = new Date(endDate);

  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    yield current.toISOString().split('T')[0];
    current.setDate(current.getDate() + 1);
  }
};

// ===================================================
// ===== PUBLIC HOLIDAYS =====
// ===================================================

/**
 * Fetch all public holiday dates in a date range.
 * Returns a Set of 'YYYY-MM-DD' strings for O(1) lookup during roster generation.
 */
export const getPublicHolidaySet = async (startDate, endDate) => {
  const holidays = await PublicHoliday.findAll({
    where: {
      holiday_date: { [Op.between]: [startDate, endDate] },
    },
    attributes: ['holiday_date'],
  });

  return new Set(holidays.map((h) => h.holiday_date));
};

// ===================================================
// ===== HOLIDAY HOURS CALCULATION =====
// ===================================================

/**
 * Calculate how many hours of a shift fall on a holiday.
 *
 *   roster_date is holiday  → 22:00–00:00 = holiday (2h), 00:00–06:00 = normal (6h)
 *   next day    is holiday  → 22:00–00:00 = normal  (2h), 00:00–06:00 = holiday (6h)
 *   both are holidays       → entire shift is holiday (8h)
 *   neither is holiday      → entire shift is normal  (8h)
 *
 * @param {Object}  shift  
 * @param {boolean} isHoliday         
 * @param {boolean} isNextDayHoliday  
 * @returns {{ holiday_hours, normal_hours, total_hours }}
 */
export const calculateHolidayHours = (shift, isHoliday, isNextDayHoliday = false) => {
  if (!shift) {
    return { holiday_hours: 0, normal_hours: 0, total_hours: 0 };
  }

  const startH = parseInt(shift.start_time?.split(':')[0] ?? 0, 10);
  const endH   = parseInt(shift.end_time?.split(':')[0]   ?? 0, 10);

  // Total shift duration in hours
  // Grave/overnight: end < start, so add 24 to end side
  const totalHours = shift.is_grave || endH < startH
    ? (24 - startH) + endH
    : endH - startH;

  // ── Non-grave shift ──────────────────────────────────────────────────────
  if (!shift.is_grave && endH >= startH) {
    return {
      holiday_hours: isHoliday ? totalHours : 0,
      normal_hours:  isHoliday ? 0 : totalHours,
      total_hours:   totalHours,
    };
  }

  // ── Grave shift (crosses midnight) ───────────────────────────────────────
  // hoursBeforeMidnight: 22:00 → 00:00  (24 - 22 = 2)
  // hoursAfterMidnight:  00:00 → 06:00  (endH    = 6)
  const hoursBeforeMidnight = 24 - startH;
  const hoursAfterMidnight  = endH;

  let holiday_hours = 0;
  let normal_hours  = 0;

  if (isHoliday && isNextDayHoliday) {
    // Both sides of midnight are holidays — full shift at holiday rate
    holiday_hours = totalHours;

  } else if (isHoliday) {
    // Only the shift START date is a holiday (22:00–00:00)
    holiday_hours = hoursBeforeMidnight;
    normal_hours  = hoursAfterMidnight;

  } else if (isNextDayHoliday) {
    // Only the NEXT day is a holiday (00:00–06:00)
    normal_hours  = hoursBeforeMidnight;
    holiday_hours = hoursAfterMidnight;

  } else {
    // No holiday — full shift at normal rate
    normal_hours = totalHours;
  }

  return { holiday_hours, normal_hours, total_hours: totalHours };
};

/**
 * Given a YYYY-MM-DD string return the next calendar day as YYYY-MM-DD.
 */
export const getNextDay = (dateStr) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};