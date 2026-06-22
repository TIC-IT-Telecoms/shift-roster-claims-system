// controllers/claimController.js
import { Op } from 'sequelize';
import {
  Employee, Claim, Approval,
  Roster, Shift, Team, User,
} from '../models/index.js';
import { getCurrentUserContext } from '../utils/authHelpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';
import {
  createNotification,
  notifyAdmins,
  notifyClaimOwner,
} from '../utils/notificationService.js';
import {
  getNextDay,
  calculateHolidayHours,
  getPublicHolidaySet,
} from '../utils/rotationUtils.js';

// TODO: Uncomment when emailService.js is built
// import {
//   sendEmployeeClaimSubmissionEmail,
//   sendAdminNewClaimAlertEmail,
//   sendClaimStatusUpdateEmail,
// } from '../utils/emailService.js';

// ===== Constants =====
const SHIFT_TYPES = ['Early Shift', 'Night Shift', 'Grave Shift'];

// ===== Shared claim include =====
const claimInclude = [
  {
    model: Employee,
    as: 'employee',
    attributes: ['employee_id', 'name', 'email', 'hourly_rate'],
    include: [{ model: Team, as: 'team', attributes: ['team_id', 'team_name'] }],
  },
  {
    model: Approval,
    as: 'approval',
    attributes: ['approval_id', 'approved_by', 'status', 'notes', 'approved_at'],
  },
];

// ===== Helper: validate roster match for a claim date =====
const validateRosterMatch = async (employeeId, claimDate, shiftType) => {
  const roster = await Roster.findOne({
    where: { employee_id: employeeId, roster_date: claimDate },
    include: [{
      model: Shift,
      as: 'shift',
      attributes: ['shift_id', 'shift_name', 'start_time', 'end_time', 'is_grave'],
    }],
  });

  if (!roster) {
    throw new ErrorResponse(
      `No roster entry found for ${claimDate}. You can only claim against a scheduled shift.`,
      400
    );
  }

  if (roster.status === 'Off') {
    throw new ErrorResponse(
      `You are scheduled Off on ${claimDate}. Cannot submit a claim for an Off day.`,
      400
    );
  }

  if (roster.shift?.shift_name !== shiftType) {
    throw new ErrorResponse(
      `Shift mismatch: your rostered shift on ${claimDate} is "${roster.shift?.shift_name}" ` +
      `but you submitted "${shiftType}".`,
      400
    );
  }

  return roster;
};

// ===== Helper: resolve holiday context for a date + shift =====
const getHolidayContext = async (claimDate, shift) => {
  const nextDay = getNextDay(claimDate);
  const holidaySet = await getPublicHolidaySet(claimDate, nextDay);

  const isHoliday        = holidaySet.has(claimDate);
  const isNextDayHoliday = shift?.is_grave ? holidaySet.has(nextDay) : false;

  return { isHoliday, isNextDayHoliday };
};

// @desc    Submit a new claim
// @route   POST /api/claims
// @access  Private (employee)
export const submitClaim = asyncHandler(async (req, res, next) => {
  const { claim_date, shift_type, hours_worked, overtime_hours = 0, description } = req.body;

  if (!claim_date || !shift_type || !hours_worked) {
    return next(new ErrorResponse('claim_date, shift_type and hours_worked are required', 400));
  }

  if (isNaN(Date.parse(claim_date))) {
    return next(new ErrorResponse('claim_date must be a valid date (YYYY-MM-DD)', 400));
  }

  if (!SHIFT_TYPES.includes(shift_type)) {
    return next(new ErrorResponse(
      `Invalid shift_type. Must be one of: ${SHIFT_TYPES.join(', ')}`, 400
    ));
  }

  if (isNaN(hours_worked) || Number(hours_worked) <= 0) {
    return next(new ErrorResponse('hours_worked must be a positive number', 400));
  }

  if (isNaN(overtime_hours) || Number(overtime_hours) < 0) {
    return next(new ErrorResponse('overtime_hours must be zero or a positive number', 400));
  }

  const { userId, employeeId } = await getCurrentUserContext(req);

  const employee = await Employee.findByPk(employeeId);
  if (!employee) {
    return next(new ErrorResponse('Employee record not found for this user', 404));
  }

  // Prevent duplicate claim for same date
  const existing = await Claim.findOne({
    where: { employee_id: employeeId, claim_date },
  });
  if (existing) {
    return next(new ErrorResponse(
      `A claim already exists for ${claim_date} (status: ${existing.status})`, 400
    ));
  }

  // Validate against rostered shift
  let roster;
  try {
    roster = await validateRosterMatch(employeeId, claim_date, shift_type);
  } catch (err) {
    return next(err);
  }

  // Auto-detect holiday — also checks next day for grave shifts
  const { isHoliday, isNextDayHoliday } = await getHolidayContext(claim_date, roster.shift);

  // Calculate holiday/normal split for logging (payroll uses this at calculation time)
  const hoursSplit = calculateHolidayHours(roster.shift, isHoliday, isNextDayHoliday);

  const claim = await Claim.create({
    employee_id:    employeeId,
    claim_date,
    shift_type,
    hours_worked:   Number(hours_worked),
    overtime_hours: Number(overtime_hours),
    is_holiday:     isHoliday || isNextDayHoliday,
    status:         'Pending',
    description:    description?.trim() || null,
  });

  logger.info(
    `Claim submitted: ID ${claim.claim_id} | Employee ID ${employeeId} | ` +
    `Date: ${claim_date} | Holiday: ${isHoliday} | ` +
    `Next-day holiday: ${isNextDayHoliday} | ` +
    `Holiday hours: ${hoursSplit.holiday_hours}/${hoursSplit.total_hours}`
  );

  // Notify submitting employee
  await createNotification({
    user_id:        userId,
    type:           'claim_submitted',
    title:          'Claim Submitted',
    message:        `Your claim for ${claim_date} (${shift_type}) has been submitted and is awaiting approval.`,
    reference_id:   claim.claim_id,
    reference_type: 'claim',
  });

  // Notify all admins
  await notifyAdmins({
    type:           'claim_submitted',
    title:          'New Claim Submitted',
    message:        `${employee.name} submitted a claim for ${claim_date} (${shift_type} · ${hours_worked}h).`,
    reference_id:   claim.claim_id,
    reference_type: 'claim',
  });

  // TODO: sendEmployeeClaimSubmissionEmail(employee.email, employee.name, claim);

  return successResponse(res, claim, 'Claim submitted successfully', 201);
});

// @desc    Get own claims (employee)
// @route   GET /api/claims/me
// @access  Private (employee)
export const getMyClaims = asyncHandler(async (req, res, next) => {
  const { status, start_date, end_date } = req.query;
  const { employeeId } = await getCurrentUserContext(req);

  const where = { employee_id: employeeId };

  if (status) {
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return next(new ErrorResponse('Invalid status filter', 400));
    }
    where.status = status;
  }

  if (start_date && end_date) {
    where.claim_date = { [Op.between]: [start_date, end_date] };
  }

  const claims = await Claim.findAll({
    where,
    include: [{
      model: Approval,
      as: 'approval',
      attributes: ['approval_id', 'approved_by', 'status', 'notes', 'approved_at'],
    }],
    order: [['claim_date', 'DESC']],
  });

  logger.info(`My claims fetched: Employee ID ${employeeId} | ${claims.length} records`);

  return successResponse(res, claims, 'Claims fetched successfully');
});

// @desc    Get all claims (admin) or own claims (employee)
// @route   GET /api/claims
// @access  Private
export const getAllClaims = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const whereClause = {};
  const { employeeId, role } = await getCurrentUserContext(req);

  if (status) whereClause.status = status;

  // Data Isolation Guard: If the caller isn't an Admin, filter the query by their employee_id
  if (role !== 'Admin') {
    whereClause.employee_id = employeeId;
  }

  const claims = await Claim.findAll({
    where: whereClause,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'name', 'email', 'hourly_rate'],
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['team_name']
          }
        ]
      },
      {
        model: Approval,
        as: 'approval',
        attributes: ['approval_id', 'approved_by', 'approved_at', 'notes']
      }
    ],
    order: [['claim_date', 'DESC']]
  });

  return successResponse(res, claims, 'Claims retrieved successfully');
});


// @desc    Get single claim by ID
// @route   GET /api/claims/:id
// @access  Admin or claim owner
export const getClaimById = asyncHandler(async (req, res, next) => {
  const { employeeId, role } = await getCurrentUserContext(req);

  const claim = await Claim.findByPk(req.params.id, { include: claimInclude });

  if (!claim) {
    return next(new ErrorResponse(`Claim not found: ID ${req.params.id}`, 404));
  }

  if (role !== 'admin' && claim.employee_id !== employeeId) {
    return next(new ErrorResponse('Access denied: You can only view your own claims', 403));
  }

  return successResponse(res, claim, 'Claim fetched successfully');
});

// @desc    Update claim — only Rejected claims (after admin reset)
// @route   PUT /api/claims/:id
// @access  Private (employee — own rejected claims only)
export const updateClaim = asyncHandler(async (req, res, next) => {
  const { shift_type, hours_worked, overtime_hours, description } = req.body;
  const { employeeId } = await getCurrentUserContext(req);

  const claim = await Claim.findByPk(req.params.id);
  if (!claim) {
    return next(new ErrorResponse(`Claim not found: ID ${req.params.id}`, 404));
  }

  if (claim.employee_id !== employeeId) {
    logger.warn(
      `Unauthorized edit: Employee ID ${employeeId} ` +
      `attempted to edit Claim ID ${claim.claim_id}`
    );
    return next(new ErrorResponse('You can only edit your own claims', 403));
  }

  // Only Rejected claims are editable — must be reset by admin first
  if (claim.status !== 'Rejected') {
    return next(new ErrorResponse(
      `Only rejected claims can be edited. This claim is "${claim.status}".`, 400
    ));
  }

  if (shift_type && !SHIFT_TYPES.includes(shift_type)) {
    return next(new ErrorResponse(
      `Invalid shift_type. Must be one of: ${SHIFT_TYPES.join(', ')}`, 400
    ));
  }

  if (hours_worked !== undefined && (isNaN(hours_worked) || Number(hours_worked) <= 0)) {
    return next(new ErrorResponse('hours_worked must be a positive number', 400));
  }

  // Re-validate roster match if shift type is changing
  const updatedShiftType = shift_type ?? claim.shift_type;
  try {
    await validateRosterMatch(employeeId, claim.claim_date, updatedShiftType);
  } catch (err) {
    return next(err);
  }

  await claim.update({
    shift_type:     updatedShiftType,
    hours_worked:   hours_worked   !== undefined ? Number(hours_worked)   : claim.hours_worked,
    overtime_hours: overtime_hours !== undefined ? Number(overtime_hours) : claim.overtime_hours,
    description:    description    !== undefined ? description?.trim() || null : claim.description,
    updated_at:     new Date(),
  });

  logger.info(`Claim updated: ID ${claim.claim_id} | Employee ID ${employeeId}`);

  return successResponse(res, claim, 'Claim updated successfully');
});

// @desc    Approve or reject a claim — creates Approval record
// @route   PATCH /api/claims/:id/status
// @access  Admin
export const reviewClaim = asyncHandler(async (req, res, next) => {
  const { status, notes, comments } = req.body;
  const { userId, employeeId: adminEmployeeId } = await getCurrentUserContext(req);

  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorResponse('Status must be Approved or Rejected', 400));
  }

  const claim = await Claim.findByPk(req.params.id, {
    include: [{ model: Employee, as: 'employee' }],
  });

  if (!claim) {
    return next(new ErrorResponse(`Claim not found: ID ${req.params.id}`, 404));
  }

  if (claim.status !== 'Pending') {
    logger.warn(
      `Review denied: Admin Employee ID ${adminEmployeeId} attempted to change ` +
      `finalized Claim ID ${claim.claim_id} (${claim.status})`
    );
    return next(new ErrorResponse(
      `This claim has already been processed and is marked "${claim.status}".`, 400
    ));
  }

  const finalizedNotes = notes?.trim() || comments?.trim() ||
    `Claim ${status.toLowerCase()} by admin.`;

  // Update claim status
  await claim.update({ status, updated_at: new Date() });

  // Create approval audit record — approved_by stores the admin's employee_id
  await Approval.create({
    claim_id:    claim.claim_id,
    approved_by: userId,
    status,
    notes:       finalizedNotes,
    approved_at: new Date(),
  });

  // Notify the claim owner
  const claimOwnerUser = await User.findOne({
    where:      { employee_id: claim.employee_id },
    attributes: ['user_id'],
  });

  if (claimOwnerUser) {
    await notifyClaimOwner({
      user_id:   claimOwnerUser.user_id,
      type:      status === 'Approved' ? 'claim_approved' : 'claim_rejected',
      title:     status === 'Approved' ? 'Claim Approved' : 'Claim Rejected',
      message:   status === 'Approved'
        ? `Your claim #CLM${String(claim.claim_id).padStart(4, '0')} for ${claim.claim_date} has been approved.`
        : `Your claim #CLM${String(claim.claim_id).padStart(4, '0')} for ${claim.claim_date} was rejected. Reason: ${finalizedNotes}`,
      claim_id:  claim.claim_id,
    });
  }

  logger.info(
    `Claim reviewed: ID ${claim.claim_id} → ${status} | ` +
    `Admin Employee ID ${adminEmployeeId}`
  );

  // TODO: sendClaimStatusUpdateEmail(claim.employee.email, claim.employee.name, status, finalizedNotes);

  return successResponse(res, claim, `Claim ${status.toLowerCase()} successfully`);
});

// @desc    Admin resets rejected claim back to Pending (unlocks for employee edit)
// @route   PATCH /api/claims/:id/reset
// @access  Admin
export const resetClaimStatus = asyncHandler(async (req, res, next) => {
  const { employeeId: adminEmployeeId } = await getCurrentUserContext(req);

  const claim = await Claim.findByPk(req.params.id, { include: claimInclude });
  if (!claim) {
    return next(new ErrorResponse(`Claim not found: ID ${req.params.id}`, 404));
  }

  if (claim.status !== 'Rejected') {
    return next(new ErrorResponse(
      `Only rejected claims can be reset. This claim is "${claim.status}".`, 400
    ));
  }

  await claim.update({ status: 'Pending', updated_at: new Date() });

  // Notify the employee so they know they can resubmit
  const claimOwnerUser = await User.findOne({
    where:      { employee_id: claim.employee_id },
    attributes: ['user_id'],
  });

  if (claimOwnerUser) {
    await notifyClaimOwner({
      user_id:   claimOwnerUser.user_id,
      type:      'claim_reset',
      title:     'Claim Reset — Action Required',
      message:   `Your claim #CLM${String(claim.claim_id).padStart(4, '0')} has been reset to Pending. You may now edit and resubmit it.`,
      claim_id:  claim.claim_id,
    });
  }

  logger.info(
    `Claim reset to Pending: ID ${claim.claim_id} | ` +
    `Reset by Admin Employee ID ${adminEmployeeId}`
  );

  return successResponse(res, claim, 'Claim reset to Pending successfully');
});

// @desc    Delete claim (admin — Pending or Rejected only; approved claims are locked)
// @route   DELETE /api/claims/:id
// @access  Admin
export const deleteClaim = asyncHandler(async (req, res, next) => {
  const { employeeId: adminEmployeeId } = await getCurrentUserContext(req);

  const claim = await Claim.findByPk(req.params.id);
  if (!claim) {
    return next(new ErrorResponse(`Claim not found: ID ${req.params.id}`, 404));
  }

  // Approved claims feed payroll — cannot be deleted
  if (claim.status === 'Approved') {
    return next(new ErrorResponse(
      'Approved claims cannot be deleted as they are used in payroll calculations.', 400
    ));
  }

  await claim.destroy();

  logger.info(
    `Claim deleted: ID ${claim.claim_id} | ` +
    `Employee ID ${claim.employee_id} | ` +
    `Deleted by Admin Employee ID ${adminEmployeeId}`
  );

  return successResponse(res, null, 'Claim deleted successfully');
});