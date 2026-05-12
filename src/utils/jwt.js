import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
import { ErrorResponse } from './ErrorResponse.js';

const getJwtConfig = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    logger.error('JWT_SECRET is not defined in environment variables');
    throw new ErrorResponse('JWT_SECRET is not defined', 500);
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  };
};

export const generateToken = (payload) => {
  const { secret, expiresIn } = getJwtConfig();

  const token = jwt.sign(payload, secret, { expiresIn });

  logger.info(`Token generated for user ID: ${payload.id} | expires in: ${expiresIn}`);

  return token;
};

export const verifyToken = (token) => {
  const { secret } = getJwtConfig();

  try {
    const decoded = jwt.verify(token, secret);

    logger.info(`Token verified successfully for user ID: ${decoded.id}`);

    return decoded;
  } catch (error) {
    logger.warn(`Token verification failed: ${error.message}`);

    throw new ErrorResponse('Invalid or expired token', 401);
  }
};