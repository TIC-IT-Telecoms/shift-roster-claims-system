import { Claim } from '../models/Claim.js';
import { Employee } from '../models/Employee.js'; 
import { Approval } from '../models/Approval.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';

// Import our newly created email notification utilities
import { 
  sendEmployeeClaimSubmissionEmail, 
  sendAdminNewClaimAlertEmail, 
  sendClaimStatusUpdateEmail 
} from '../utils/emailService.js';
import { where } from 'sequelize';

// @desc    Create a new claim
// @route   POST /api/claims
// @access  Private (Employee Only)
export const createClaim = asyncHandler(async (req, res, next) => {
  const { claim_date, shift_type, hours_worked, overtime_hours, is_holiday } = req.body;

  if (!claim_date || !shift_type) {
    return next(new ErrorResponse('Please provide claim_date and shift_type', 400));
  }

  // Self-Assign Ownership: Uses the user id embedded in the JWT payload by authController
  const userId = req.user.user_id || req.user.id;

  // Find the user record
const user = await User.findByPk(userId);

if (!user) {
  return res.status(404).json({
    success: false,
    message: 'User not found'
  });
}

  const claim = await Claim.create({
    employee_id: user.employee_id,
    claim_date,
    shift_type,
    hours_worked: hours_worked || 0,
    overtime_hours: overtime_hours || 0,
    is_holiday: is_holiday || false,
    status: 'Pending'
  });

  logger.info(`Claim ID ${claim.claim_id} created successfully by employee ID: ${userId}`);

  // ─── EMAIL NOTIFICATION ENGINE (SUBMISSION) ────────────────────────────────
  // Fetch the current employee's profile information to extract email details safely
  // const currentEmployee = await Employee.findByPk({ where: { employee_id: user.employee_id } });

  // if (currentEmployee) {
  //   // 1. Dispatch confirmation receipt back to the employee
  //   sendEmployeeClaimSubmissionEmail(currentEmployee.email, currentEmployee.name, claim);

  //   // 2. Locate active Administrators to ping them about the incoming review action
  //   User.findAll({ where: { role: 'Admin' } })
  //     .then((administrators) => {
  //       administrators.forEach((admin) => {
  //         sendAdminNewClaimAlertEmail(admin.username, currentEmployee.name, claim);
  //       });
  //     })
  //     .catch((err) => logger.error(`Admin review email distribution error: ${err.message}`));
  // }
  // ────────────────────────────────────────────────────────────────────────────

  return successResponse(res, claim, 'Claim submitted successfully', 201);
});

// @desc    Get all claims (Admin sees all, Employee sees only their own)
// @route   GET /api/claims
// @access  Private (Admin & Employee)
export const getAllClaims = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const whereClause = {};
  const userId = req.user.user_id || req.user.id;

  if (status) whereClause.status = status;

  // Data Isolation Guard: If the caller isn't an Admin, filter the query by their employee_id
  if (req.user.role !== 'Admin') {
    whereClause.employee_id = userId;
  }

  const claims = await Claim.findAll({ 
    where: whereClause,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'name', 'email'] // Uses 'name' to match your database schema
      },
      {
        model: Approval,
        as: 'approval',
        attributes: ['approval_id', 'approved_by', 'approved_at', 'notes'] // Matches actual schema columns
      }
    ],
    order: [['claim_date', 'DESC']]
  });
  
  return successResponse(res, claims, 'Claims retrieved successfully');
});

// @desc    Get single claim by ID
// @route   GET /api/claims/:id
// @access  Private (Admin or Owner Employee)
export const getClaimById = asyncHandler(async (req, res, next) => {
  const userId = req.user.user_id || req.user.id;
  
  const claim = await Claim.findByPk(req.params.id, {
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['employee_id', 'name', 'email']
      },
      {
        model: Approval,
        as: 'approval'
      }
    ]
  });

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // Cross-Viewing Protection: Block employees from peeking at rows belonging to others
  if (req.user.role !== 'Admin' && claim.employee_id !== userId) {
    return next(new ErrorResponse('Access denied: You can only view your own claims', 403));
  }

  return successResponse(res, claim, 'Claim details retrieved successfully');
});

// @desc    Update claim values (Permitted only for Owner Employee if Pending)
// @route   PUT /api/claims/:id
// @access  Private (Employee Only)
export const updateClaim = asyncHandler(async (req, res, next) => {
  const userId = req.user.user_id || req.user.id;
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // Security Check: Enforce record ownership
  if (claim.employee_id !== userId) {
    return next(new ErrorResponse('Access denied: You can only modify your own claims', 403));
  }

  // State Check: Lock the record if it is no longer Pending
  if (claim.status !== 'Pending') {
    return next(new ErrorResponse(`Cannot update a claim that is already ${claim.status.toLowerCase()}`, 400));
  }

  const updatedClaim = await claim.update({
    ...req.body,
    updated_at: new Date()
  }, {
    fields: ['claim_date', 'shift_type', 'hours_worked', 'overtime_hours', 'is_holiday', 'updated_at']
  });

  logger.info(`Claim ID ${claim.claim_id} modified by employee ID: ${userId}`);
  return successResponse(res, updatedClaim, 'Claim updated successfully');
});

// @desc    Review/Approve/Reject a claim & log to tracking tables
// @route   PATCH /api/claims/:id/status
// @access  Private (Admin Only)
export const reviewClaim = asyncHandler(async (req, res, next) => {
  const { status, notes, comments } = req.body;
  const adminId = req.user.user_id || req.user.id;

  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorResponse('Please provide a valid status update (Approved or Rejected)', 400));
  }

  // Include Employee relation data mapping step to retrieve target contact parameters cleanly
  const claim = await Claim.findByPk(req.params.id, {
    include: [{ model: Employee, as: 'employee' }]
  });

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // ─── STATE GUARD CONDITION ──────────────────────────────────────────────────
  // Enforce business rule: A claim's status can only be modified ONCE (while Pending)
  if (claim.status !== 'Pending') {
    logger.warn(`Admin ID ${adminId} denied changing finalized Claim ID ${claim.claim_id} (Current Status: ${claim.status})`);
    return next(
      new ErrorResponse(
        `Review denied: This claim has already been processed and is marked as "${claim.status}".`, 
        400
      )
    );
  }

  const finalizedNotes = notes || comments || `Claim processed to ${status.toLowerCase()}.`;

  // 1. Update parent claim record status
  await claim.update({ 
    status,
    updated_at: new Date()
  });

  // 2. Insert audit footprint into approvals tracking table using explicit DB column attributes
  await Approval.create({
    claim_id: claim.claim_id,
    approved_by: adminId, 
    status,
    notes: finalizedNotes,
    approved_at: new Date()
  });

  logger.info(`Claim ID ${claim.claim_id} status updated to ${status} by Admin ID: ${adminId}`);

  // ─── EMAIL NOTIFICATION ENGINE (DECISION) ──────────────────────────────────
  // Check if relation map built a valid employee address profile to avoid runtime crashing
  if (claim.employee) {
    sendClaimStatusUpdateEmail(claim.employee.email, claim.employee.name, status, finalizedNotes);
  }
  // ────────────────────────────────────────────────────────────────────────────

  return successResponse(res, claim, `Claim status successfully changed to ${status}`);
});

// @desc    Delete single claim (Permitted only for Owner Employee if Pending)
// @route   DELETE /api/claims/:id
// @access  Private (Employee Only)
export const deleteClaim = asyncHandler(async (req, res, next) => {
  const userId = req.user.user_id || req.user.id;
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // Security Check: Enforce record ownership
  if (claim.employee_id !== userId) {
    return next(new ErrorResponse('Access denied: You can only delete your own claims', 403));
  }

  // State Check: Lock the record if it is no longer Pending
  if (claim.status !== 'Pending') {
    return next(new ErrorResponse(`Cannot delete a claim that has already been ${claim.status.toLowerCase()}`, 400));
  }

  await claim.destroy();

  logger.info(`Claim ID ${req.params.id} permanently removed by employee ID: ${userId}`);
  return successResponse(res, null, 'Claim removed successfully');
});