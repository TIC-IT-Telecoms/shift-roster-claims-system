import { ErrorResponse } from './utils/ErrorResponse.js';
import { logger } from './utils/logger.js';

/**
 * Restrict access based on user roles
 * Usage: authorizeRoles('Admin', 'Manager')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Role check failed: no user in request');
      return next(new ErrorResponse('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Access denied for role: ${req.user.role} (required: ${roles})`
      );

      return next(
        new ErrorResponse('Access denied: insufficient permissions', 403)
      );
    }

    logger.info(`Role authorized: ${req.user.role}`);

    next();
  };
};