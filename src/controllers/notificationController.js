import { Op } from 'sequelize';
import { Notification } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Get notifications for authenticated user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res, next) => {
  const { unread_only, limit = 50, offset = 0 } = req.query;

  const where = { user_id: req.user.id };
  if (unread_only === 'true') where.is_read = false;

  const { count, rows: notifications } = await Notification.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: Number(offset),
  });

  const unreadCount = await Notification.count({
    where: { user_id: req.user.id, is_read: false },
  });

  logger.info(`Notifications fetched: User ID ${req.user.id} | ${notifications.length} records`);

  return successResponse(
    res,
    {
      notifications,
      total: count,
      unread_count: unreadCount,
      limit: Number(limit),
      offset: Number(offset),
    },
    'Notifications fetched successfully'
  );
});

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    where: {
      notification_id: req.params.id,
      user_id: req.user.id, // Ensure ownership
    },
  });

  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  await notification.update({ is_read: true });

  return successResponse(res, notification, 'Notification marked as read');
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res, next) => {
  const [count] = await Notification.update(
    { is_read: true },
    { where: { user_id: req.user.id, is_read: false } }
  );

  logger.info(`All notifications marked read: User ID ${req.user.id} | ${count} updated`);

  return successResponse(res, { updated: count }, 'All notifications marked as read');
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    where: {
      notification_id: req.params.id,
      user_id: req.user.id,
    },
  });

  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  await notification.destroy();

  return successResponse(res, null, 'Notification deleted');
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
export const clearReadNotifications = asyncHandler(async (req, res, next) => {
  const deleted = await Notification.destroy({
    where: { user_id: req.user.id, is_read: true },
  });

  logger.info(`Read notifications cleared: User ID ${req.user.id} | ${deleted} removed`);

  return successResponse(res, { deleted }, 'Read notifications cleared');
});