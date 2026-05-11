import express from 'express';
import {
  createShift, getShifts, getShiftById,
  updateShift, deleteShift,
} from '../controllers/shiftController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/shifts
// @route   GET /api/shifts/:id
// All authenticated users can view
router.get('/', protect, getShifts);
router.get('/:id', protect, getShiftById);

// @route   POST /api/shifts
// @route   PUT /api/shifts/:id
// @route   DELETE /api/shifts/:id
// Admin only for mutations
router.post('/', protect, authorizeRoles('Admin'), createShift);
router.put('/:id', protect, authorizeRoles('Admin'), updateShift);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteShift);

export default router;