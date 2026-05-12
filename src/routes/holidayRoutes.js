import express from 'express';
import {
  createHoliday,
  bulkCreateHolidays,
  getHolidays,
  getHolidayById,
  checkHolidayByDate,
  updateHoliday,
  deleteHoliday,
} from '../controllers/holidayController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// ===== All authenticated users =====
router.get('/', protect, getHolidays);
router.get('/check/:date', protect, checkHolidayByDate);
router.get('/:id', protect, getHolidayById);

// ===== Admin only =====
router.post('/', protect, authorizeRoles('Admin'), createHoliday);
router.post('/bulk', protect, authorizeRoles('Admin'), bulkCreateHolidays);
router.put('/:id', protect, authorizeRoles('Admin'), updateHoliday);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteHoliday);

export default router;