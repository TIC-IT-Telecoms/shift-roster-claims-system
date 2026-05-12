import express from 'express';
import {
  generateRoster, getRosters, getEmployeeRoster,
  getMyRoster, updateRosterEntry, deleteRosterRange,
} from '../controllers/rosterController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ===== Employee accessible =====

// @route   GET /api/rosters/me
router.get('/me', protect, getMyRoster);

// ===== Admin only =====

// @route   POST /api/rosters/generate
router.post('/generate', protect, authorizeRoles('Admin'), generateRoster);

// @route   GET /api/rosters
router.get('/', protect, authorizeRoles('Admin'), getRosters);

// @route   GET /api/rosters/employee/:employee_id
router.get('/employee/:employee_id', protect, authorizeRoles('Admin'), getEmployeeRoster);

// @route   PATCH /api/rosters/:id
router.patch('/:id', protect, authorizeRoles('Admin'), updateRosterEntry);

// @route   DELETE /api/rosters
router.delete('/', protect, authorizeRoles('Admin'), deleteRosterRange);

export default router;