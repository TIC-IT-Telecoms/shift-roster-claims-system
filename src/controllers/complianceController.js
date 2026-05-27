import { ComplianceFlag } from '../models/ComplianceFlag.js';
import { Claim } from '../models/Claim.js';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

// Helper function to get the Monday (Week Start) of a given date string
const getWeekStartDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when Sunday is 0
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// @desc    Run compliance validation engine on an employee's claims for a given week/date range
// @route   POST /api/compliance/check
// @access  Private (Admin Only)
export const checkCompliance = asyncHandler(async (req, res, next) => {
  const { employee_id, start_date, end_date } = req.body;

  if (!employee_id || !start_date || !end_date) {
    return next(new ErrorResponse('Please provide employee_id, start_date, and end_date', 400));
  }

  // 1. Fetch all claims submitted by the employee in this date range
  const claims = await Claim.findAll({
    where: {
      employee_id,
      claim_date: {
        [Op.between]: [start_date, end_date]
      }
    },
    order: [['claim_date', 'ASC']]
  });

  if (claims.length === 0) {
    return successResponse(res, [], 'No claims found to evaluate compliance for this timeframe');
  }

  const generatedFlags = [];
  let cumulativeNormalHours = 0;
  let cumulativeOvertimeHours = 0;
  let previousClaim = null;

  // 2. Loop through claims to evaluate Daily BCEA Rules
  for (const claim of claims) {
    const normalHours = parseFloat(claim.hours_worked || 0);
    const otHours = parseFloat(claim.overtime_hours || 0);
    
    cumulativeNormalHours += normalHours;
    cumulativeOvertimeHours += otHours;

    // Rule A: Meal Interval Flag (Spreadsheet Rule: Shift above 5 hours requires a break)
    if (normalHours > 5) {
      const ruleName = 'Meal Interval Required';
      const flagExists = await ComplianceFlag.findOne({
        where: { employee_id, flag_date: claim.claim_date, rule_violated: ruleName }
      });

      if (!flagExists) {
        const flag = await ComplianceFlag.create({
          employee_id,
          flag_date: claim.claim_date,
          rule_violated: ruleName,
          description: `Shift hours (${normalHours} hrs) exceed the continuous 5-hour limit without a logged meal break.`,
          severity: 'Low',
          resolved: false
        });
        generatedFlags.push(flag);
      }
    }

    // Rule B: Daily Rest Minimum (Spreadsheet Rule: Minimum 12 consecutive hours of rest between shifts)
    if (previousClaim) {
      const prevDate = new Date(previousClaim.claim_date);
      const currDate = new Date(claim.claim_date);
      const daysBetween = (currDate - prevDate) / (1000 * 60 * 60 * 24);

      // Flag if shifts are on back-to-back days and it was a Night-to-Day/Evening turnaround
      if (daysBetween === 1 && previousClaim.shift_type === 'Night' && (claim.shift_type === 'Day' || claim.shift_type === 'Evening')) {
        const ruleName = 'Short Daily Rest Period';
        const flagExists = await ComplianceFlag.findOne({
          where: { employee_id, flag_date: claim.claim_date, rule_violated: ruleName }
        });

        if (!flagExists) {
          const flag = await ComplianceFlag.create({
            employee_id,
            flag_date: claim.claim_date,
            rule_violated: ruleName,
            description: `Back-to-back shift rotation (${previousClaim.shift_type} to ${claim.shift_type}) breaks the BCEA 12-hour minimum daily rest rule.`,
            severity: 'Medium',
            resolved: false
          });
          generatedFlags.push(flag);
        }
      }
    }
    previousClaim = claim;
  }

  // Rule C: Weekly Ordinary Hours Limit Check (Spreadsheet Rule: Capped at 45 ordinary hours per week)
  if (cumulativeNormalHours > 45) {
    const ruleName = 'BCEA Weekly Ordinary Hours Limit Exceeded';
    const flagExists = await ComplianceFlag.findOne({
      where: { employee_id, flag_date: end_date, rule_violated: ruleName }
    });

    if (!flagExists) {
      const flag = await ComplianceFlag.create({
        employee_id,
        flag_date: end_date,
        rule_violated: ruleName,
        description: `Weekly accumulated ordinary hours reached ${cumulativeNormalHours} hrs, exceeding the statutory 45-hour limit.`,
        severity: 'High',
        resolved: false
      });
      generatedFlags.push(flag);
    }
  }

  // Rule D: Weekly Overtime Hours Limit Check (Spreadsheet Rule: Capped at 10 overtime hours per week)
  if (cumulativeOvertimeHours > 10) {
    const ruleName = 'BCEA Weekly Overtime Limit Exceeded';
    const flagExists = await ComplianceFlag.findOne({
      where: { employee_id, flag_date: end_date, rule_violated: ruleName }
    });

    if (!flagExists) {
      const flag = await ComplianceFlag.create({
        employee_id,
        flag_date: end_date,
        rule_violated: ruleName,
        description: `Weekly accumulated overtime hours reached ${cumulativeOvertimeHours} hrs, exceeding the legal 10-hour cap.`,
        severity: 'High',
        resolved: false
      });
      generatedFlags.push(flag);
    }
  }

  logger.info(`Compliance validation engine executed for employee ID ${employee_id}. Generated ${generatedFlags.length} flags.`);
  return successResponse(res, generatedFlags, 'Compliance validation processing complete');
});

// @desc    Get compliance flags (Admin sees organization exceptions, Employee sees personal alerts)
// @route   GET /api/compliance
// @access  Private (Admin & Employee)
export const getComplianceFlags = asyncHandler(async (req, res, next) => {
  const { resolved } = req.query;
  const whereClause = {};

  if (resolved !== undefined) {
    whereClause.resolved = resolved === 'true';
  }

  // Data Isolation: If user is an Employee, restrict them to looking at their own compliance records
  if (req.user.role !== 'Admin') {
    whereClause.employee_id = req.user.id;
  }

  const flags = await ComplianceFlag.findAll({
    where: whereClause,
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['employee_id', 'name', 'email']
    }],
    order: [['flag_date', 'DESC']]
  });

  return successResponse(res, flags, 'Compliance data history fetched successfully');
});

// @desc    Resolve / Dismiss an exception flag with manager override
// @route   PATCH /api/compliance/:id/resolve
// @access  Private (Admin Only)
export const resolveFlag = asyncHandler(async (req, res, next) => {
  const flag = await ComplianceFlag.findByPk(req.params.id);

  if (!flag) {
    return next(new ErrorResponse(`Compliance flag record not found with ID of ${req.params.id}`, 404));
  }

  await flag.update({ resolved: true });

  logger.info(`Compliance exception ID ${req.params.id} marked resolved by Admin user ID ${req.user.id}`);
  return successResponse(res, flag, 'Compliance flag marked as resolved successfully');
});