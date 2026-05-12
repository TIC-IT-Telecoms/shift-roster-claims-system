import express from 'express';
import {
  createRotationCycle, getRotationCycles, getRotationCycleById,
  getCurrentCycleDay, getActiveCyclesForToday, updateRotationCycle,
  updateRotationDetails, deleteRotationCycle,
} from '../controllers/rotationController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorizeRoles('Admin'));

// @route   GET /api/rotations/active  ← must be before /:id
router.get('/active', getActiveCyclesForToday);

// @route   POST /api/rotations
router.post('/', createRotationCycle);

// @route   GET /api/rotations
router.get('/', getRotationCycles);

// @route   GET /api/rotations/:id
router.get('/:id', getRotationCycleById);

// @route   GET /api/rotations/:id/current-day
router.get('/:id/current-day', getCurrentCycleDay);

// @route   PUT /api/rotations/:id
router.put('/:id', updateRotationCycle);

// @route   PUT /api/rotations/:id/details
router.put('/:id/details', updateRotationDetails);

// @route   DELETE /api/rotations/:id
router.delete('/:id', deleteRotationCycle);

export default router;