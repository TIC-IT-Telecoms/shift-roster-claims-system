import { User } from '../models/index.js';
import { ErrorResponse } from './ErrorResponse.js';

export const getCurrentUserContext = async (req) => {
  const userId = req.user.user_id || req.user.id;

  const user = await User.findByPk(userId, {
    attributes: ['user_id', 'employee_id', 'role']
  });

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }

  return {
    userId: user.user_id,
    employeeId: user.employee_id,
    role: user.role
  };
};