import { Op } from 'sequelize';
import { ComplianceFlag, Claim, Employee, Team } from '../models/index.js';
import { getCurrentUserContext } from '../utils/authHelpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';

// ===== Shared include =====
const flagInclude = [{
  model:      Employee,
  as:         'employee',
  attributes: ['employee_id', 'name', 'email'],
  include:    [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
}];

// ===== Core rules engine — runs against one employee's claims =====
const evaluateClaims = async (employeeId, claims) => {
  const generated = [];
  let cumulativeNormal   = 0;
  let cumulativeOvertime = 0;
  let prev = null;

  const upsertFlag = async (data) => {
    const [flag, created] = await ComplianceFlag.findOrCreate({
      where: {
        employee_id:   employeeId,
        flag_date:     data.flag_date,
        rule_violated: data.rule_violated,
      },
      defaults: { ...data, resolved: false },
    });
    if (created) generated.push(flag);
    return { flag, created };
  };

  for (const claim of claims) {
    const hours   = parseFloat(claim.hours_worked   || 0);
    const otHours = parseFloat(claim.overtime_hours || 0);

    cumulativeNormal   += hours;
    cumulativeOvertime += otHours;

    // Rule A — Daily overtime cap (BCEA: max 3h OT per day)
    if (otHours > 3) {
      await upsertFlag({
        employee_id:   employeeId,
        flag_date:     claim.claim_date,
        rule_violated: 'Daily Overtime Cap Exceeded',
        description:   `Overtime hours (${otHours}h) on ${claim.claim_date} exceed the BCEA daily cap of 3 hours.`,
        severity:      'High',
      });
    }

    // Rule B — Meal interval (BCEA: break required when shift > 5h continuous)
    if (hours > 5) {
      await upsertFlag({
        employee_id:   employeeId,
        flag_date:     claim.claim_date,
        rule_violated: 'Meal Interval Required',
        description:   `Shift of ${hours}h on ${claim.claim_date} exceeds 5 continuous hours. A meal break must be recorded.`,
        severity:      'Low',
      });
    }

    // Rule C — Short daily rest (BCEA: 12h minimum rest between shifts)
    if (prev) {
      const prevDate    = new Date(prev.claim_date);
      const currDate    = new Date(claim.claim_date);
      const daysBetween = (currDate - prevDate) / 86_400_000;

      const nightToEarlyTurnaround =
        daysBetween === 1 &&
        (prev.shift_type === 'Night Shift' || prev.shift_type === 'Grave Shift') &&
        claim.shift_type === 'Early Shift';

      if (nightToEarlyTurnaround) {
        await upsertFlag({
          employee_id:   employeeId,
          flag_date:     claim.claim_date,
          rule_violated: 'Short Daily Rest Period',
          description:   `Back-to-back ${prev.shift_type} → ${claim.shift_type} rotation on ${claim.claim_date} may breach the BCEA 12-hour minimum rest requirement.`,
          severity:      'Medium',
        });
      }
    }

    prev = claim;
  }

  // Rule D — Weekly ordinary hours (BCEA: max 45h/week)
  if (cumulativeNormal > 45) {
    await upsertFlag({
      employee_id:   employeeId,
      flag_date:     claims.at(-1).claim_date,
      rule_violated: 'Weekly Ordinary Hours Limit Exceeded',
      description:   `Accumulated ordinary hours (${cumulativeNormal}h) exceed the BCEA statutory cap of 45 hours per week.`,
      severity:      'High',
    });
  }

  // Rule E — Weekly overtime limit (BCEA: max 10h OT/week)
  if (cumulativeOvertime > 10) {
    await upsertFlag({
      employee_id:   employeeId,
      flag_date:     claims.at(-1).claim_date,
      rule_violated: 'Weekly Overtime Limit Exceeded',
      description:   `Accumulated overtime hours (${cumulativeOvertime}h) exceed the BCEA legal cap of 10 hours per week.`,
      severity:      'High',
    });
  }

  return generated;
};

// @desc    Run compliance check for a single employee
// @route   POST /api/compliance/check
// @access  Admin
export const checkCompliance = asyncHandler(async (req, res, next) => {
  const { employee_id, start_date, end_date } = req.body;

  if (!employee_id || !start_date || !end_date) {
    return next(new ErrorResponse('employee_id, start_date and end_date are required', 400));
  }

  const employee = await Employee.findByPk(employee_id);
  if (!employee) return next(new ErrorResponse('Employee not found', 404));

  const claims = await Claim.findAll({
    where: {
      employee_id,
      claim_date: { [Op.between]: [start_date, end_date] },
    },
    order: [['claim_date', 'ASC']],
  });

  if (!claims.length) {
    return successResponse(res, [], 'No claims found for this employee in the selected period.');
  }

  const generated = await evaluateClaims(employee_id, claims);

  logger.info(
    `Compliance check: Employee ID ${employee_id} | ` +
    `${start_date} → ${end_date} | ${generated.length} new flags`
  );

  return successResponse(
    res,
    generated,
    `Check complete — ${generated.length} new flag${generated.length !== 1 ? 's' : ''} generated.`
  );
});

// @desc    Run compliance check for ALL active employees in a period
// @route   POST /api/compliance/check-all
// @access  Admin
export const checkComplianceAll = asyncHandler(async (req, res, next) => {
  const { start_date, end_date, team_id } = req.body;

  if (!start_date || !end_date) {
    return next(new ErrorResponse('start_date and end_date are required', 400));
  }

  const empWhere = { status: 'Active' };
  if (team_id) empWhere.team_id = team_id;

  const employees = await Employee.findAll({ where: empWhere, attributes: ['employee_id', 'name'] });
  if (!employees.length) return next(new ErrorResponse('No active employees found', 404));

  let totalFlags  = 0;
  let checkedEmp  = 0;

  for (const emp of employees) {
    const claims = await Claim.findAll({
      where: {
        employee_id: emp.employee_id,
        claim_date:  { [Op.between]: [start_date, end_date] },
      },
      order: [['claim_date', 'ASC']],
    });
    if (!claims.length) continue;

    const flags = await evaluateClaims(emp.employee_id, claims);
    totalFlags += flags.length;
    checkedEmp++;
  }

  logger.info(
    `Bulk compliance check: ${start_date} → ${end_date} | ` +
    `${checkedEmp} employees checked | ${totalFlags} new flags`
  );

  return successResponse(
    res,
    { employees_checked: checkedEmp, flags_generated: totalFlags },
    `Bulk check complete — ${totalFlags} new flag${totalFlags !== 1 ? 's' : ''} across ${checkedEmp} employees.`
  );
});

// @desc    Get compliance flags (admin = all, employee = own)
// @route   GET /api/compliance
// @access  Private
export const getComplianceFlags = asyncHandler(async (req, res, next) => {
  const { employeeId, role } = await getCurrentUserContext(req);
  const { resolved, severity, employee_id, start_date, end_date } = req.query;

  const where = {};

  if (role !== 'admin') {
    where.employee_id = employeeId;
  } else if (employee_id) {
    where.employee_id = employee_id;
  }

  if (resolved !== undefined) where.resolved = resolved === 'true';
  if (severity)               where.severity = severity;

  if (start_date && end_date) {
    where.flag_date = { [Op.between]: [start_date, end_date] };
  }

  const flags = await ComplianceFlag.findAll({
    where,
    include: flagInclude,
    order:   [['flag_date', 'DESC']],
  });

  return successResponse(res, flags, 'Compliance flags fetched');
});

// @desc    Get own compliance flags (employee)
// @route   GET /api/compliance/me
// @access  Private (employee)
export const getMyComplianceFlags = asyncHandler(async (req, res, next) => {
  const { employeeId } = await getCurrentUserContext(req);
  const { resolved } = req.query;

  const where = { employee_id: employeeId };
  if (resolved !== undefined) where.resolved = resolved === 'true';

  const flags = await ComplianceFlag.findAll({
    where,
    order: [['flag_date', 'DESC']],
  });

  return successResponse(res, flags, 'Your compliance flags fetched');
});

// @desc    Resolve a flag
// @route   PATCH /api/compliance/:id/resolve
// @access  Admin
export const resolveFlag = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;
  const { userId } = await getCurrentUserContext(req);

  const flag = await ComplianceFlag.findByPk(req.params.id, { include: flagInclude });
  if (!flag) return next(new ErrorResponse('Compliance flag not found', 404));

  if (flag.resolved) {
    return next(new ErrorResponse('This flag has already been resolved', 400));
  }

  await flag.update({
    resolved:     true,
    resolved_at:  new Date(),
    resolved_by:  userId,
    resolve_notes: notes?.trim() || 'Resolved by admin override.',
  });

  logger.info(`Compliance flag ID ${flag.compliance_id} resolved by User ID ${userId}`);
  return successResponse(res, flag, 'Flag marked as resolved');
});

// @desc    Delete a compliance flag
// @route   DELETE /api/compliance/:id
// @access  Admin
export const deleteFlag = asyncHandler(async (req, res, next) => {
  const flag = await ComplianceFlag.findByPk(req.params.id);
  if (!flag) return next(new ErrorResponse('Compliance flag not found', 404));

  await flag.destroy();
  logger.info(`Compliance flag ID ${req.params.id} deleted`);
  return successResponse(res, null, 'Flag deleted');
});