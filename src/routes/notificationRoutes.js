// routes/notificationRoutes.js
import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/notifications
router.get('/', getNotifications);

// @route   PATCH /api/notifications/read-all  ← before /:id
router.patch('/read-all', markAllAsRead);

// @route   DELETE /api/notifications/clear-read ← before /:id
router.delete('/clear-read', clearReadNotifications);

// @route   PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// @route   DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

export default router;