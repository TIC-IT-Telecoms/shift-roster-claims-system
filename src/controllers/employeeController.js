import { Employee, Team } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';


// CREATE EMPLOYEE
export const createEmployee = asyncHandler(async (req, res, next) => {
  const { name, email, phone, team_id, hourly_rate, role } = req.body;

  // CHECK EXISTING EMAIL
  const existingEmployee = await Employee.findOne({
    where: { email },
  });

  if (existingEmployee) {
    logger.warn(`Employee creation failed: Email already exists (${email})`);

    return next(
      new ErrorResponse('Employee email already exists', 400)
    );
  }

  if (team_id) {
    const team = await Team.findByPk(team_id);

    if (!team) {
      logger.warn(`Employee creation failed: Team not found (${team_id})`);

      return next(new ErrorResponse('Team not found', 404));
    }
  }

  // CREATE EMPLOYEE
  const employee = await Employee.create({
    name, email, phone, team_id, hourly_rate, role
  });

  logger.info(`Employee created successfully: ID ${employee.employee_id}`);

  return successResponse(res, employee, 'Employee created successfully', 201);
});


// GET ALL EMPLOYEES
export const getEmployees = asyncHandler(async (req, res, next) => {
  const employees = await Employee.findAll({
    include: [
      {
        model: Team,
        as: 'team',
        attributes: ['team_id', 'team_name'],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  logger.info('Employee list fetched successfully');

  return successResponse(res, employees, 'Employees fetched successfully');
});


// GET SINGLE EMPLOYEE
export const getEmployeeById = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id, {
    include: [
      {
        model: Team,
        as: 'team',
        attributes: ['team_id', 'team_name'],
      },
    ],
  });

  if (!employee) {
    logger.warn(`Employee not found: ID ${req.params.id}`);

    return next(new ErrorResponse('Employee not found', 404));
  }

  logger.info(`Employee fetched successfully: ID ${employee.employee_id}`);

  return successResponse(res, employee, 'Employee fetched successfully');
});


// UPDATE EMPLOYEE
export const updateEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id);

  if (!employee) {
    logger.warn(`Update failed: Employee not found (${req.params.id})`);

    return next(new ErrorResponse('Employee not found', 404));
  }

  // VALIDATE TEAM IF PROVIDED
  if (req.body.team_id) {
    const team = await Team.findByPk(req.body.team_id);

    if (!team) {
      logger.warn(`Update failed: Team not found (${req.body.team_id})`);

      return next(new ErrorResponse('Team not found', 404));
    }
  }

  // CHECK EMAIL DUPLICATE
  if (req.body.email) {
    const existingEmail = await Employee.findOne({
      where: { email: req.body.email },
    });

    if (existingEmail && existingEmail.employee_id !== employee.employee_id) {
      logger.warn(`Update failed: Email already exists (${req.body.email})`);

      return next(new ErrorResponse('Employee email already exists', 400));
    }
  }

  await employee.update(req.body);

  logger.info(`Employee updated successfully: ID ${employee.employee_id}`);

  return successResponse(res, employee, 'Employee updated successfully');
});


// DEACTIVATE EMPLOYEE
export const deactivateEmployee = asyncHandler(
  async (req, res, next) => {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      logger.warn(`Deactivate failed: Employee not found (${req.params.id})`);

      return next(new ErrorResponse('Employee not found', 404));
    }

    // PREVENT SELF DEACTIVATION
    if (employee.employee_id === req.user.id) {
      logger.warn(`User attempted self-deactivation: User ID ${req.user.id}`);

      return next(new ErrorResponse('You cannot deactivate your own account', 400));
    }

    employee.status = 'Inactive';

    await employee.save();

    logger.info(`Employee deactivated: ID ${employee.employee_id}`);

    return successResponse(res, null, 'Employee deactivated successfully');
  }
);


// ASSIGN EMPLOYEE TO TEAM
export const assignEmployeeTeam = asyncHandler(
  async (req, res, next) => {
    const { team_id } = req.body;

    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      logger.warn(`Assign team failed: Employee not found (${req.params.id})`);

      return next(new ErrorResponse('Employee not found', 404));
    }

    const team = await Team.findByPk(team_id);

    if (!team) {
      logger.warn(`Assign team failed: Team not found (${team_id})`);

      return next(new ErrorResponse('Team not found', 404));
    }

    employee.team_id = team_id;

    await employee.save();

    logger.info(`Employee ID ${employee.employee_id} assigned to Team ID ${team_id}`);

    return successResponse(res, employee, 'Employee assigned to team successfully');
  }
);