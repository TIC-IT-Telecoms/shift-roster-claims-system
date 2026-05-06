import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.warn('Access denied: No token provided');
    return next(new ErrorResponse('Not authorized, no token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    logger.info(`Authenticated user ID: ${decoded.id}`);

    next();
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`);
    return next(
      new ErrorResponse('Not authorized, token is invalid or expired', 401)
    );
  }
};

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