import { Notification, User } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Create a single notification for a specific user
 */
export const createNotification = async ({
  user_id,
  type,
  title,
  message,
  reference_id = null,
  reference_type = null,
}) => {
  try {
    const notification = await Notification.create({
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
    });
    return notification;
  } catch (err) {
    // Never crash the calling controller — log and continue
    logger.error(`Failed to create notification for user ${user_id}: ${err.message}`);
    return null;
  }
};

/**
 * Notify all admin users
 */
export const notifyAdmins = async ({ type, title, message, reference_id, reference_type }) => {
  try {
    const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['user_id'] });
    await Promise.all(
      admins.map((admin) =>
        createNotification({ user_id: admin.user_id, type, title, message, reference_id, reference_type })
      )
    );
  } catch (err) {
    logger.error(`Failed to notify admins: ${err.message}`);
  }
};

/**
 * Notify employee who owns a claim
 */
export const notifyClaimOwner = async ({ user_id, type, title, message, claim_id }) => {
  return createNotification({
    user_id,
    type,
    title,
    message,
    reference_id: claim_id,
    reference_type: 'claim',
  });
};

/**
 * Notify all employees affected by a roster generation
 */
export const notifyRosterPublished = async ({ employee_ids, start_date, end_date }) => {
  try {
    // Resolve user_ids from employee_ids
    const users = await User.findAll({
      where: { employee_id: employee_ids },
      attributes: ['user_id'],
    });

    await Promise.all(
      users.map((user) =>
        createNotification({
          user_id: user.user_id,
          type: 'roster_published',
          title: 'Roster Published',
          message: `Your roster for ${start_date} to ${end_date} has been published. Check your schedule.`,
          reference_type: 'roster',
        })
      )
    );

    logger.info(`Roster notifications sent to ${users.length} employees`);
  } catch (err) {
    logger.error(`Failed to send roster notifications: ${err.message}`);
  }
};