import express from 'express';
import {
  generatePayroll, generatePayrollBulk, getPayrollPreview,
  getPayrollHistory, getMyPayroll, getPayrollById, deletePayroll,
} from '../controllers/payrollController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/preview', protect, authorizeRoles('Admin'), getPayrollPreview);
router.get('/', protect, authorizeRoles('Admin'), getPayrollHistory);
router.get('/me', protect, getMyPayroll);
router.get('/:id', protect, getPayrollById);
router.post('/generate', protect, authorizeRoles('Admin'), generatePayroll);
router.post('/generate-bulk', protect, authorizeRoles('Admin'), generatePayrollBulk);
router.delete('/:id', protect, authorizeRoles('Admin'), deletePayroll);

export default router;