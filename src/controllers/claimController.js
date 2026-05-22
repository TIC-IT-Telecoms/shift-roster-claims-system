import { Claim } from '../models/Claim.js';
import { Employee } from '../models/Employee.js'; 
import { Approval } from '../models/Approval.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Create a new claim
// @route   POST /api/claims
// @access  Private (Employee Only)
export const createClaim = asyncHandler(async (req, res, next) => {
  const { claim_date, shift_type, hours_worked, overtime_hours, is_holiday } = req.body;

  if (!claim_date || !shift_type) {
    return next(new ErrorResponse('Please provide claim_date and shift_type', 400));
  }

  // Self-Assign Ownership: Uses the employee_id embedded in the JWT payload by authController
  const claim = await Claim.create({
    employee_id: req.user.id,
    claim_date,
    shift_type,
    hours_worked: hours_worked || 0,
    overtime_hours: overtime_hours || 0,
    is_holiday: is_holiday || false,
    status: 'Pending'
  });

  logger.info(`Claim ID ${claim.claim_id} created successfully by employee ID: ${req.user.id}`);
  return successResponse(res, claim, 'Claim submitted successfully', 201);
});

// @desc    Get all claims (Admin sees all, Employee sees only their own)
// @route   GET /api/claims
// @access  Private (Admin & Employee)
export const getAllClaims = asyncHandler(async (req, res, next) => {
  const { status } = req.query;
  const whereClause = {};

  if (status) whereClause.status = status;

  // Data Isolation Guard: If the caller isn't an Admin, filter the query by their employee_id
  if (req.user.role !== 'Admin') {
    whereClause.employee_id = req.user.id;
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
  if (req.user.role !== 'Admin' && claim.employee_id !== req.user.id) {
    return next(new ErrorResponse('Access denied: You can only view your own claims', 403));
  }

  return successResponse(res, claim, 'Claim details retrieved successfully');
});

// @desc    Update claim values (Permitted only for Owner Employee if Pending)
// @route   PUT /api/claims/:id
// @access  Private (Employee Only)
export const updateClaim = asyncHandler(async (req, res, next) => {
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // Security Check: Enforce record ownership
  if (claim.employee_id !== req.user.id) {
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

  logger.info(`Claim ID ${claim.claim_id} modified by employee ID: ${req.user.id}`);
  return successResponse(res, updatedClaim, 'Claim updated successfully');
});

// @desc    Review/Approve/Reject a claim & log to tracking tables
// @route   PATCH /api/claims/:id/status
// @access  Private (Admin Only)
export const reviewClaim = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorResponse('Please provide a valid status update (Approved or Rejected)', 400));
  }

  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // 1. Update parent claim record status
  await claim.update({ 
    status,
    updated_at: new Date()
  });

  // 2. Insert audit footprint into approvals tracking table using explicit DB column attributes
  await Approval.create({
    claim_id: claim.claim_id,
    approved_by: req.user.id, 
    status,
    notes: notes || `Claim processed to ${status.toLowerCase()}.`,
    approved_at: new Date()
  });

  logger.info(`Claim ID ${claim.claim_id} status updated to ${status} by Admin ID: ${req.user.id}`);
  return successResponse(res, claim, `Claim status successfully changed to ${status}`);
});

// @desc    Delete single claim (Permitted only for Owner Employee if Pending)
// @route   DELETE /api/claims/:id
// @access  Private (Employee Only)
export const deleteClaim = asyncHandler(async (req, res, next) => {
  const claim = await Claim.findByPk(req.params.id);

  if (!claim) {
    return next(new ErrorResponse(`Claim not found with ID of ${req.params.id}`, 404));
  }

  // Security Check: Enforce record ownership
  if (claim.employee_id !== req.user.id) {
    return next(new ErrorResponse('Access denied: You can only delete your own claims', 403));
  }

  // State Check: Lock the record if it is no longer Pending
  if (claim.status !== 'Pending') {
    return next(new ErrorResponse(`Cannot delete a claim that has already been ${claim.status.toLowerCase()}`, 400));
  }

  await claim.destroy();

  logger.info(`Claim ID ${req.params.id} permanently removed by employee ID: ${req.user.id}`);
  return successResponse(res, null, 'Claim removed successfully');
});