import express from 'express';
import { createEmployee, getEmployees, getEmployeeById,
  updateEmployee, deactivateEmployee, assignEmployeeTeam,
} from '../controllers/employeeController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('Admin'));

router.post('/', createEmployee);
router.get('/', getEmployees);

router.get('/:id', getEmployeeById);
router.put('/:id', updateEmployee);
router.patch('/:id/deactivate', deactivateEmployee);
router.patch('/:id/team', assignEmployeeTeam);

export default router;