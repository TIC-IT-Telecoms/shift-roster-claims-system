import express from 'express';
import {
  createEmployee, getEmployees, getEmployeeById, activateEmployee,
  updateEmployee, deactivateEmployee, assignEmployeeTeam,
} from '../controllers/employeesController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorizeRoles('Admin'));

// @route   POST /api/employees
router.post('/', createEmployee);

// @route   GET /api/employees
router.get('/', getEmployees);

// @route   GET /api/employees/:id
router.get('/:id', getEmployeeById);

// @route   PUT /api/employees/:id
router.put('/:id', updateEmployee);

// @route   PATCH /api/employees/:id/deactivate
router.patch('/:id/deactivate', deactivateEmployee);

// @route   PATCH /api/employees/:id/deactivate
router.patch('/:id/activate', activateEmployee);

// @route   PATCH /api/employees/:id/assign-team
router.patch('/:id/assign-team', assignEmployeeTeam);

export default router;