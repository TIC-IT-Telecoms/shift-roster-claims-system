import { Op } from 'sequelize';
import { RotationCycle, RotationDetail, Team, Shift } from '../models/index.js';
import { ErrorResponse } from './ErrorResponse.js';

// ===== Resolve current cycle day for a given date =====
// Auto-loops when cycle completes — day count wraps back to 1
export const resolveCurrentDay = (startDate, cycleLength, targetDate = new Date()) => {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null; // Target is before cycle start date

  return (diffDays % cycleLength) + 1;
};

// ===== Normalize HH:MM to HH:MM:SS =====
export const normalizeTime = (time) => {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
};

// ===== Check if a cycle is currently active based on start_date =====
export const isCycleActive = (startDate, targetDate = new Date()) => {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target >= start;
};

// ===== Get all currently active cycles =====
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
          { model: Shift, as: 'shift', attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'] },
        ],
      },
    ],
  });
};

// ===== Validate detail entries before DB insert =====
export const validateDetails = async (details, cycleLength, transaction) => {
  if (!Array.isArray(details) || !details.length) {
    throw new ErrorResponse('details array is required', 400);
  }

  // Check for duplicate team on same day within the submission itself
  const seen = new Set();
  for (const { day_number, team_id, shift_id } of details) {
    if (!day_number || !team_id || !shift_id) {
      throw new ErrorResponse(
        'Each detail entry must include day_number, team_id and shift_id',
        400
      );
    }

    if (!Number.isInteger(day_number) || day_number < 1 || day_number > cycleLength) {
      throw new ErrorResponse(
        `day_number ${day_number} is out of range — must be between 1 and ${cycleLength}`,
        400
      );
    }

    const key = `${day_number}-${team_id}`;
    if (seen.has(key)) {
      throw new ErrorResponse(
        `Duplicate entry: Team ID ${team_id} assigned more than once on day ${day_number}`,
        400
      );
    }
    seen.add(key);

    const team = await Team.findByPk(team_id, { transaction });
    if (!team) throw new ErrorResponse(`Team not found: ID ${team_id}`, 404);

    const shift = await Shift.findByPk(shift_id, { transaction });
    if (!shift) throw new ErrorResponse(`Shift not found: ID ${shift_id}`, 404);
  }
};

// ===== Check if any active cycles overlap with a new start_date =====
// Returns overlapping cycles — caller decides whether to warn or block
export const checkCycleOverlap = async (startDate, excludeId = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = { start_date: { [Op.lte]: today } };
  if (excludeId) where.rotation_id = { [Op.ne]: excludeId };

  return RotationCycle.findAll({ where, attributes: ['rotation_id', 'cycle_name', 'start_date'] });
};