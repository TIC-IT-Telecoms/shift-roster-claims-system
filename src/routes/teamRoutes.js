import express from 'express';
import {
  createTeam, getTeams, getTeamById, updateTeam, 
  assignEmployeesToTeam, deleteTeam,
} from '../controllers/teamController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorizeRoles('Admin'));

// @route   POST /api/teams
router.post('/', createTeam);

// @route   GET /api/teams
router.get('/', getTeams);

// @route   GET /api/teams/:id
router.get('/:id', getTeamById);

// @route   PUT /api/teams/:id
router.put('/:id', updateTeam);

// @route   PATCH /api/teams/:id/assign
router.patch('/:id/assign', assignEmployeesToTeam);

// @route   DELETE /api/teams/:id
router.delete('/:id', deleteTeam);

export default router;