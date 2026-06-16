import { Op } from 'sequelize';
import { Payroll, Claim, Employee, Team, User } from '../models/index.js';
import { getCurrentUserContext } from '../utils/authHelpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';
import {
  calculateHolidayHours,
  getNextDay,
  getPublicHolidaySet,
} from '../utils/rotationUtils.js';

const GRAVE_ALLOWANCE = 60.00;

// ===== Shared include =====
const payrollInclude = [
  {
    model: Employee,
    as:    'employee',
    attributes: ['employee_id', 'name', 'email', 'hourly_rate'],
    include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
  },
];

// ===== Compute pay for a single employee's approved claims =====
const computeEmployeePay = async (employee, claims) => {
  const rate = parseFloat(employee.hourly_rate || 0);

  let totalNormalPay    = 0;
  let totalOvertimePay  = 0;
  let totalHolidayPay   = 0;
  let totalGraveAllow   = 0;

  // Build holiday set for the period (for grave-shift split)
  if (claims.length > 0) {
    const dates = claims.map((c) => c.claim_date);
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = getNextDay(dates.reduce((a, b) => (a > b ? a : b)));
    const holidaySet = await getPublicHolidaySet(minDate, maxDate);

    claims.forEach((claim) => {
      const hours   = parseFloat(claim.hours_worked   || 0);
      const otHours = parseFloat(claim.overtime_hours || 0);
      const shift   = claim.shift ?? null;

      // Normal pay
      totalNormalPay += hours * rate;

      // Overtime pay (×1.5)
      totalOvertimePay += otHours * rate * 1.5;

      // Holiday pay — grave shifts split at midnight
      if (claim.is_holiday) {
        const nextDay          = getNextDay(claim.claim_date);
        const isNextDayHoliday = shift?.is_grave ? holidaySet.has(nextDay) : false;
        const { holiday_hours, total_hours } = calculateHolidayHours(
          shift, true, isNextDayHoliday
        );
        // Holiday premium = additional 1× for the holiday portion (already paid normal above)
        const ratio         = total_hours > 0 ? holiday_hours / total_hours : 0;
        const holidayHours  = hours * ratio;
        totalHolidayPay    += holidayHours * rate;
      }

      // Grave shift allowance
      if (claim.shift_type?.toLowerCase().includes('grave')) {
        totalGraveAllow += GRAVE_ALLOWANCE;
      }
    });
  }

  const totalPay = totalNormalPay + totalOvertimePay + totalHolidayPay + totalGraveAllow;

  return {
    totalNormalPay:   parseFloat(totalNormalPay.toFixed(2)),
    totalOvertimePay: parseFloat(totalOvertimePay.toFixed(2)),
    totalHolidayPay:  parseFloat(totalHolidayPay.toFixed(2)),
    totalGraveAllow:  parseFloat(totalGraveAllow.toFixed(2)),
    totalPay:         parseFloat(totalPay.toFixed(2)),
    claimsCount:      claims.length,
  };
};

// @desc    Generate payroll for a single employee
// @route   POST /api/payroll/generate
// @access  Admin
export const generatePayroll = asyncHandler(async (req, res, next) => {
  const { employee_id, pay_period_start, pay_period_end } = req.body;
  const { userId } = await getCurrentUserContext(req);

  if (!employee_id || !pay_period_start || !pay_period_end) {
    return next(new ErrorResponse(
      'employee_id, pay_period_start and pay_period_end are required', 400
    ));
  }

  const employee = await Employee.findByPk(employee_id);
  if (!employee) return next(new ErrorResponse('Employee not found', 404));

  // Prevent duplicate payroll for same period
  const existing = await Payroll.findOne({
    where: { employee_id, pay_period_start, pay_period_end },
  });
  if (existing) {
    return next(new ErrorResponse(
      `Payroll already exists for this employee and period (ID: ${existing.payroll_id})`, 409
    ));
  }

  const claims = await Claim.findAll({
    where: {
      employee_id,
      status:     'Approved',
      claim_date: { [Op.between]: [pay_period_start, pay_period_end] },
    },
  });

  if (!claims.length) {
    return next(new ErrorResponse(
      'No approved claims found for this employee in the selected period', 404
    ));
  }

  const pay = await computeEmployeePay(employee, claims);

  const record = await Payroll.create({
    employee_id,
    pay_period_start,
    pay_period_end,
    normal_pay:      pay.totalNormalPay,
    overtime_pay:    pay.totalOvertimePay,
    holiday_pay:     pay.totalHolidayPay,
    grave_allowance: pay.totalGraveAllow,
    total_pay:       pay.totalPay,
    generated_by:    userId,
    generated_at:    new Date(),
  });

  logger.info(
    `Payroll generated: ID ${record.payroll_id} | ` +
    `Employee ID ${employee_id} | ` +
    `Period ${pay_period_start} → ${pay_period_end} | ` +
    `Total ${pay.totalPay}`
  );

  return successResponse(res, record, 'Payroll generated successfully', 201);
});

// @desc    Generate payroll for ALL employees in a period (optional team filter)
// @route   POST /api/payroll/generate-bulk
// @access  Admin
export const generatePayrollBulk = asyncHandler(async (req, res, next) => {
  const { pay_period_start, pay_period_end, team_id } = req.body;
  const { userId } = await getCurrentUserContext(req);

  if (!pay_period_start || !pay_period_end) {
    return next(new ErrorResponse('pay_period_start and pay_period_end are required', 400));
  }

  const empWhere = { status: 'Active' };
  if (team_id) empWhere.team_id = team_id;

  const employees = await Employee.findAll({ where: empWhere });
  if (!employees.length) {
    return next(new ErrorResponse('No active employees found', 404));
  }

  const results  = [];
  const skipped  = [];
  const errors   = [];

  for (const employee of employees) {
    // Skip if payroll already exists for this period
    const existing = await Payroll.findOne({
      where: { employee_id: employee.employee_id, pay_period_start, pay_period_end },
    });

    if (existing) {
      skipped.push({ employee_id: employee.employee_id, name: employee.name, reason: 'Already generated' });
      continue;
    }

    const claims = await Claim.findAll({
      where: {
        employee_id: employee.employee_id,
        status:      'Approved',
        claim_date:  { [Op.between]: [pay_period_start, pay_period_end] },
      },
    });

    if (!claims.length) {
      skipped.push({ employee_id: employee.employee_id, name: employee.name, reason: 'No approved claims' });
      continue;
    }

    try {
      const pay = await computeEmployeePay(employee, claims);

      const record = await Payroll.create({
        employee_id:     employee.employee_id,
        pay_period_start,
        pay_period_end,
        normal_pay:      pay.totalNormalPay,
        overtime_pay:    pay.totalOvertimePay,
        holiday_pay:     pay.totalHolidayPay,
        grave_allowance: pay.totalGraveAllow,
        total_pay:       pay.totalPay,
        generated_by:    userId,
        generated_at:    new Date(),
      });

      results.push({ payroll_id: record.payroll_id, employee_id: employee.employee_id, name: employee.name, total_pay: pay.totalPay });
    } catch (err) {
      errors.push({ employee_id: employee.employee_id, name: employee.name, reason: err.message });
      logger.error(`Bulk payroll error for Employee ${employee.employee_id}: ${err.message}`);
    }
  }

  const grandTotal = results.reduce((s, r) => s + r.total_pay, 0);

  logger.info(
    `Bulk payroll: ${results.length} generated, ${skipped.length} skipped, ${errors.length} errors | ` +
    `Period ${pay_period_start} → ${pay_period_end} | Total R${grandTotal.toFixed(2)}`
  );

  return successResponse(res, {
    generated:   results,
    skipped,
    errors,
    grand_total: parseFloat(grandTotal.toFixed(2)),
    period:      { pay_period_start, pay_period_end },
  }, `Bulk payroll complete — ${results.length} records generated`, 201);
});

// @desc    Get payroll summary preview (before generating) based on approved claims
// @route   GET /api/payroll/preview
// @access  Admin
export const getPayrollPreview = asyncHandler(async (req, res, next) => {
  const { pay_period_start, pay_period_end, team_id } = req.query;

  if (!pay_period_start || !pay_period_end) {
    return next(new ErrorResponse('pay_period_start and pay_period_end are required', 400));
  }

  const empWhere = { status: 'Active' };
  if (team_id) empWhere.team_id = team_id;

  const employees = await Employee.findAll({ where: empWhere, attributes: ['employee_id', 'name', 'hourly_rate'] });

  let totalEmployees  = 0;
  let totalClaims     = 0;
  let estimatedTotal  = 0;

  for (const emp of employees) {
    const claims = await Claim.findAll({
      where: {
        employee_id: emp.employee_id,
        status:      'Approved',
        claim_date:  { [Op.between]: [pay_period_start, pay_period_end] },
      },
    });
    if (!claims.length) continue;

    const pay     = await computeEmployeePay(emp, claims);
    totalEmployees++;
    totalClaims   += claims.length;
    estimatedTotal += pay.totalPay;
  }

  return successResponse(res, {
    employees_with_claims: totalEmployees,
    total_approved_claims: totalClaims,
    estimated_total:       parseFloat(estimatedTotal.toFixed(2)),
    period: { pay_period_start, pay_period_end },
  }, 'Payroll preview generated');
});

// @desc    Get payroll records — admin sees all, employee sees own
// @route   GET /api/payroll
// @access  Private
export const getPayrollHistory = asyncHandler(async (req, res, next) => {
  const { employeeId, role } = await getCurrentUserContext(req);
  const { pay_period_start, pay_period_end, team_id } = req.query;

  const where = {};

  // Data isolation
  if (role !== 'admin') {
    where.employee_id = employeeId;
  } else if (pay_period_start && pay_period_end) {
    where.pay_period_start = { [Op.gte]: pay_period_start };
    where.pay_period_end   = { [Op.lte]: pay_period_end };
  }

  const employeeWhere = {};
  if (team_id && role === 'admin') employeeWhere.team_id = team_id;

  const records = await Payroll.findAll({
    where,
    include: [
      {
        model:      Employee,
        as:         'employee',
        where:      Object.keys(employeeWhere).length ? employeeWhere : undefined,
        attributes: ['employee_id', 'name', 'email', 'hourly_rate'],
        include:    [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
      },
    ],
    order: [['pay_period_end', 'DESC']],
  });

  return successResponse(res, records, 'Payroll records fetched successfully');
});

// @desc    Get own payroll (employee)
// @route   GET /api/payroll/me
// @access  Private (employee)
export const getMyPayroll = asyncHandler(async (req, res, next) => {
  const { employeeId } = await getCurrentUserContext(req);

  const records = await Payroll.findAll({
    where:  { employee_id: employeeId },
    order:  [['pay_period_end', 'DESC']],
  });

  return successResponse(res, records, 'Your payroll records fetched');
});

// @desc    Get single payroll record
// @route   GET /api/payroll/:id
// @access  Admin or owner
export const getPayrollById = asyncHandler(async (req, res, next) => {
  const { employeeId, role } = await getCurrentUserContext(req);

  const record = await Payroll.findByPk(req.params.id, { include: payrollInclude });
  if (!record) return next(new ErrorResponse('Payroll record not found', 404));

  if (role !== 'admin' && record.employee_id !== employeeId) {
    return next(new ErrorResponse('Access denied', 403));
  }

  return successResponse(res, record, 'Payroll record fetched');
});

// @desc    Delete payroll record
// @route   DELETE /api/payroll/:id
// @access  Admin
export const deletePayroll = asyncHandler(async (req, res, next) => {
  const record = await Payroll.findByPk(req.params.id);
  if (!record) return next(new ErrorResponse('Payroll record not found', 404));

  await record.destroy();
  logger.info(`Payroll ID ${req.params.id} deleted by User ID ${req.user.id}`);
  return successResponse(res, null, 'Payroll record deleted');
});