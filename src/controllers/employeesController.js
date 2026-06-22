import bcrypt from 'bcryptjs';
import { Employee, Team, User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { getCurrentUserContext } from '../utils/authHelpers.js';

// @desc    Get all employees
// @route   GET /api/employees
// @access  Admin
export const getEmployees = asyncHandler(async (req, res, next) => {
  const employees = await Employee.findAll({
    include: [
      { model: Team, as: 'team', attributes: ['team_id', 'team_name'] },
      { model: User, as: 'user', attributes: ['user_id', 'username', 'role'] },
      {
        model: Employee,
        as: 'supervisor',
        attributes: ['employee_id', 'name', 'role'],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  return successResponse(res, employees, 'Employees fetched successfully');
});

// @desc    Get single employee
// @route   GET /api/employees/:id  
// @access  Admin
export const getEmployeeById = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id, {
    include: [
      { model: Team, as: 'team', attributes: ['team_id', 'team_name'] },
      { model: User, as: 'user', attributes: ['user_id', 'username', 'role'] },
      { model: Employee, as: 'supervisor', attributes: ['employee_id', 'name', 'role'] },
    ],
  });

  if (!employee) {
    return next(new ErrorResponse('Employee not found', 404));
  }

  return successResponse(res, employee, 'Employee fetched successfully');
});

// @desc    Create employee + user account
// @route   POST /api/employees
// @access  Admin
export const createEmployee = asyncHandler(async (req, res, next) => {
  const {
    name, email, phone, team_id, hourly_rate, role, password,
    employment_type, id_number, address, supervisor_id,
  } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorResponse('name, email and password are required', 400));
  }

  const normalizedEmail = email.trim().toLowerCase();
  const username = normalizedEmail;

  const existingEmployee = await Employee.findOne({ where: { email: normalizedEmail } });
  if (existingEmployee) {
    return next(new ErrorResponse('Employee email already exists', 400));
  }

  const existingUser = await User.findOne({ where: { username } });
  if (existingUser) {
    return next(new ErrorResponse('Username already exists', 400));
  }

  if (team_id) {
    const team = await Team.findByPk(team_id);
    if (!team) return next(new ErrorResponse('Team not found', 404));
  }

  // Validate supervisor exists if provided
  if (supervisor_id) {
    const supervisor = await Employee.findByPk(supervisor_id);
    if (!supervisor) {
      return next(new ErrorResponse('Supervisor not found', 404));
    }
  }

  // Validate id_number uniqueness if provided
  if (id_number) {
    const existingId = await Employee.findOne({ where: { id_number } });
    if (existingId) {
      return next(new ErrorResponse('ID number already exists', 400));
    }
  }

  const { employee, user } = await sequelize.transaction(async (t) => {
    const employee = await Employee.create(
      {
        name: name.trim(), email: normalizedEmail, phone, team_id,
        hourly_rate, role,
        employment_type: employment_type || 'Full Time',
        id_number: id_number || null,
        address: address || null,
        supervisor_id: supervisor_id || null,
      },
      { transaction: t }
    );

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create(
      { employee_id: employee.employee_id, username, password_hash, role },
      { transaction: t }
    );

    return { employee, user };
  });

  logger.info(`Employee + User created: ID ${employee.employee_id}`);

  return successResponse(
    res,
    {
      employee,
      user: { user_id: user.user_id, username: user.username, role: user.role },
    },
    'Employee created successfully',
    201
  );
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Admin
export const updateEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id);

  if (!employee) {
    return next(new ErrorResponse('Employee not found', 404));
  }

  const {
    name, email, phone, team_id, hourly_rate, role,
    employment_type, id_number, address, supervisor_id,
  } = req.body;

  if (team_id) {
    const team = await Team.findByPk(team_id);
    if (!team) return next(new ErrorResponse('Team not found', 404));
  }

  // Validate supervisor
  if (supervisor_id) {
    if (Number(supervisor_id) === employee.employee_id) {
      return next(new ErrorResponse('An employee cannot be their own supervisor', 400));
    }
    const supervisor = await Employee.findByPk(supervisor_id);
    if (!supervisor) return next(new ErrorResponse('Supervisor not found', 404));
  }

  // Email uniqueness
  let normalizedEmail = employee.email;
  if (email) {
    normalizedEmail = email.trim().toLowerCase();
    const existing = await Employee.findOne({ where: { email: normalizedEmail } });
    if (existing && existing.employee_id !== employee.employee_id) {
      return next(new ErrorResponse('Employee email already exists', 400));
    }
  }

  // ID number uniqueness
  if (id_number !== undefined && id_number !== null && id_number !== employee.id_number) {
    const existingId = await Employee.findOne({ where: { id_number } });
    if (existingId && existingId.employee_id !== employee.employee_id) {
      return next(new ErrorResponse('ID number already exists', 400));
    }
  }

  await sequelize.transaction(async (t) => {
    await employee.update(
      {
        name: name ?? employee.name,
        email: normalizedEmail,
        phone: phone ?? employee.phone,
        team_id: team_id ?? employee.team_id,
        hourly_rate: hourly_rate ?? employee.hourly_rate,
        role: role ?? employee.role,
        employment_type: employment_type ?? employee.employment_type,
        id_number: id_number !== undefined ? id_number : employee.id_number,
        address: address !== undefined ? address : employee.address,
        supervisor_id: supervisor_id !== undefined ? supervisor_id : employee.supervisor_id,
      },
      { transaction: t }
    );

    const user = await User.findOne({
      where: { employee_id: employee.employee_id },
      transaction: t,
    });

    if (user) {
      if (email) user.username = normalizedEmail;
      if (role) user.role = role;
      await user.save({ transaction: t });
    }
  });

  logger.info(`Employee updated: ID ${employee.employee_id}`);

  return successResponse(res, employee, 'Employee updated successfully');
});

// @desc    Deactivate employee
// @route   PATCH /api/employees/:id/deactivate
// @access  Admin
export const deactivateEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id);
  const { employeeId } = getCurrentUserContext(req);

  if (!employee) {
    logger.warn(`Deactivate failed: Employee not found (${req.params.id})`);
    return next(new ErrorResponse('Employee not found', 404));
  }

  if (employee.employee_id === employeeId) {
    logger.warn(`Self-deactivation attempt: User ID ${req.user.id}`);
    return next(new ErrorResponse('You cannot deactivate your own account', 400));
  }

  if (employee.status === 'Inactive') {
    logger.warn(`Deactivate failed: Employee already inactive (${employee.employee_id})`);
    return next(new ErrorResponse('Employee is already inactive', 400));
  }

  employee.status = 'Inactive';
  await employee.save();

  logger.info(`Employee deactivated: ID ${employee.employee_id}`);

  return successResponse(res, null, 'Employee deactivated successfully');
});

// @desc    Activate employee
// @route   PATCH /api/employees/:id/activate
// @access  Admin
export const activateEmployee = asyncHandler(async (req, res, next) => {
  const employee = await Employee.findByPk(req.params.id);

  if (!employee) {
    logger.warn(`Activate failed: Employee not found (${req.params.id})`);
    return next(new ErrorResponse('Employee not found', 404));
  }

  if (employee.status === 'Active') {
    logger.warn(`Activate failed: Employee already active (${employee.employee_id})`);
    return next(new ErrorResponse('Employee is already active', 400));
  }

  employee.status = 'Active';
  await employee.save();

  logger.info(`Employee activated: ID ${employee.employee_id}`);
  return successResponse(res, null, 'Employee activated successfully');
});

// @desc    Assign employee to team
// @route   PATCH /api/employees/:id/assign-team
// @access  Admin
export const assignEmployeeTeam = asyncHandler(async (req, res, next) => {
  const { team_id } = req.body;

  if (!team_id) {
    logger.warn('Assign team failed: team_id is required');
    return next(new ErrorResponse('team_id is required', 400));
  }

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
});