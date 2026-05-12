import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  logger.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
