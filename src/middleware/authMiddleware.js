import jwt from 'jsonwebtoken';
import { logger } from './utils/logger.js';
import { ErrorResponse } from './utils/ErrorResponse.js';

/**
 * Protect routes - verifies JWT token
 */
export const protect = (req, res, next) => {
  let token;

  // 1. Get token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. No token found
  if (!token) {
    logger.warn('Access denied: No token provided');
    return next(new ErrorResponse('Not authorized, no token provided', 401));
  }

  try {
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user to request
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