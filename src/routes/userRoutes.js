import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get(
  '/admin',
  protect,
  authorizeRoles('Admin'),
  (req, res) => {
    res.json({ message: 'Admin panel' });
  }
);

router.get(
  '/employee',
  protect,
  authorizeRoles('Employee'),
  (req, res) => {
    res.json({ message: 'Employee panel' });
  }
);

export default router;