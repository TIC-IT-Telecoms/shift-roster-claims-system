import { Op } from 'sequelize';
import { PublicHoliday } from '../models/index.js';

// Fetch all public holiday dates within a date range
// Returns a Set of 'YYYY-MM-DD' strings for O(1) lookup
export const getPublicHolidaySet = async (startDate, endDate) => {
  const holidays = await PublicHoliday.findAll({
    where: {
      holiday_date: { [Op.between]: [startDate, endDate] },
    },
    attributes: ['holiday_date'],
  });

  return new Set(holidays.map((h) => h.holiday_date));
};

// Iterate every date in a range — yields YYYY-MM-DD strings
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

// Resolve which cycle day applies to a given date
// Reuses the same auto-loop logic from rotationUtils
export const resolveCycleDay = (startDate, cycleLength, targetDate) => {
  const start = new Date(startDate);
  const target = new Date(targetDate);

  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;

  return (diffDays % cycleLength) + 1;
};

// Validate date range — endDate must be after startDate, max 3 months
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