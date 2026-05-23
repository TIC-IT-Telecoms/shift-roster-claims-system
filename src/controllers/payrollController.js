import { Payroll } from '../models/Payroll.js';
import { Claim } from '../models/Claim.js';
import { Employee } from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

// @desc    Generate payroll records using exact spreadsheet calculation schemas
// @route   POST /api/payroll/generate
// @access  Private (Admin Only)
export const generatePayroll = asyncHandler(async (req, res, next) => {
  const { employee_id, pay_period_start, pay_period_end } = req.body;

  if (!employee_id || !pay_period_start || !pay_period_end) {
    return next(new ErrorResponse('Please provide employee_id, pay_period_start, and pay_period_end', 400));
  }

  // 1. Fetch employee to retrieve their base hourly rate
  const employee = await Employee.findByPk(employee_id);
  if (!employee) {
    return next(new ErrorResponse(`Employee not found with ID of ${employee_id}`, 404));
  }

  const baseRate = parseFloat(employee.hourly_rate || 0);

  // 2. Fetch all APPROVED claims inside the target period matching the specification rules
  const approvedClaims = await Claim.findAll({
    where: {
      employee_id,
      status: 'Approved',
      claim_date: {
        [Op.between]: [pay_period_start, pay_period_end]
      }
    }
  });

  if (approvedClaims.length === 0) {
    return next(new ErrorResponse('No approved claims found for this employee within the selected date range', 404));
  }

  // 3. Accumulator Buckets
  let totalNormalPay = 0;
  let totalOvertimePay = 0;
  let totalHolidayPay = 0;
  let totalGraveAllowance = 0;

  // 4. Compute values using exact spreadsheet formulas
  approvedClaims.forEach(claim => {
    const hours = parseFloat(claim.hours_worked || 0);
    const otHours = parseFloat(claim.overtime_hours || 0);

    // Formula 1: Normal Pay (Standard base rate applied to hours worked)
    totalNormalPay += hours * baseRate;

    // Formula 2: Overtime Pay (1.5x Time-and-a-half rate applied to overtime hours)
    totalOvertimePay += otHours * (baseRate * 1.5);

    // Formula 3: Holiday Pay (2.0x Double-time premium applied to normal hours on holidays)
    if (claim.is_holiday || claim.is_holiday === 1) {
      totalHolidayPay += hours * (baseRate * 2.0);
    }

    // Formula 4: Grave Shift Allowance (Flat R 60.00 premium per shift instance)
    if (claim.shift_type && claim.shift_type.toLowerCase().includes('grave')) {
      totalGraveAllowance += 60.00;
    }
  });

  // Formula 5: Total Gross Pay Consolidation
  const totalCalculatedPay = totalNormalPay + totalOvertimePay + totalHolidayPay + totalGraveAllowance;

  // 5. Save the generated payroll to your table schema
  const payrollRecord = await Payroll.create({
    employee_id,
    pay_period_start,
    pay_period_end,
    normal_pay: totalNormalPay.toFixed(2),
    overtime_pay: totalOvertimePay.toFixed(2),
    holiday_pay: totalHolidayPay.toFixed(2),
    grave_allowance: totalGraveAllowance.toFixed(2),
    total_pay: totalCalculatedPay.toFixed(2),
    generated_by: req.user.id, // Authenticated Admin user_id
    generated_at: new Date()
  });

  logger.info(`Payroll engine run complete: Record ID ${payrollRecord.payroll_id} saved for employee ${employee_id}`);
  return successResponse(res, payrollRecord, 'Payroll calculated and finalized successfully', 201);
});

// @desc    Get payroll history logs (Admin views all, Employee views own)
// @route   GET /api/payroll
// @access  Private (Admin & Employee)
export const getPayrollHistory = asyncHandler(async (req, res, next) => {
  const whereClause = {};

  // Data Separation Role Enforcement
  if (req.user.role !== 'Admin') {
    whereClause.employee_id = req.user.id;
  }

  const history = await Payroll.findAll({
    where: whereClause,
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['employee_id', 'name', 'email']
    }],
    order: [['pay_period_end', 'DESC']]
  });

  return successResponse(res, history, 'Payroll records fetched successfully');
});