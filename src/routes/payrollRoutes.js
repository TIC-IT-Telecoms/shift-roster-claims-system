import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { generatePayroll, getPayrollHistory } from '../controllers/payrollController.js';

const router = express.Router();

// Universal security guard: Must be logged in to hit any payroll route
router.use(protect);

// Global payroll history pathway
// GET /api/payroll -> Admin sees all records, Employee sees only their own data
router.route('/')
  .get(getPayrollHistory);

// Administrative payroll processing pathway
// POST /api/payroll/generate -> Restricted strictly to Admin users
router.post('/generate', authorizeRoles('Admin'), generatePayroll);

export default router;