import { Team, Employee, User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ErrorResponse } from '../utils/ErrorResponse.js';
import { successResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// @desc    Create team
// @route   POST /api/teams
// @access  Admin
export const createTeam = asyncHandler(async (req, res, next) => {
  const { team_name, description, employee_ids } = req.body;

  if (!team_name) {
    return next(new ErrorResponse('team name is required', 400));
  }

  const existing = await Team.findOne({ where: { team_name: team_name.trim() } });

  if (existing) {
    logger.warn(`Team creation failed: name already exists (${team_name})`);
    return next(new ErrorResponse('Team name already exists', 400));
  }

  const team = await sequelize.transaction(async (t) => {
    const newTeam = await Team.create(
      { team_name: team_name.trim(), description: description?.trim() || null },
      { transaction: t }
    );

    // Optionally assign employees on creation
    if (employee_ids?.length) {
      const employees = await Employee.findAll({
        where: { employee_id: employee_ids },
        transaction: t,
      });

      const foundIds = employees.map((e) => e.employee_id);
      const missingIds = employee_ids.filter((id) => !foundIds.includes(id));

      if (missingIds.length) {
        logger.warn(`Team creation: employees not found (${missingIds})`);
        throw new ErrorResponse(`Employees not found: ${missingIds.join(', ')}`, 404);
      }

      await Employee.update(
        { team_id: newTeam.team_id },
        { where: { employee_id: employee_ids }, transaction: t }
      );
    }

    return newTeam;
  });

  logger.info(`Team created: ID ${team.team_id} | name: ${team.team_name}`);

  return successResponse(res, team, 'Team created successfully', 201);
});

// @desc    Get all teams with employees
// @route   GET /api/teams
// @access  Admin
export const getTeams = asyncHandler(async (req, res, next) => {
  const teams = await Team.findAll({
    include: [
      {
        model: Employee,
        as: 'employees',
        attributes: ['employee_id', 'name', 'email', 'phone', 'status'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'username', 'role'],
          },
        ],
      },
    ],
    order: [['team_name', 'ASC']],
  });

  logger.info('Teams fetched successfully');

  return successResponse(res, teams, 'Teams fetched successfully');
});

// @desc    Get single team with employees
// @route   GET /api/teams/:id
// @access  Admin
export const getTeamById = asyncHandler(async (req, res, next) => {
  const team = await Team.findByPk(req.params.id, {
    include: [
      {
        model: Employee,
        as: 'employees',
        attributes: ['employee_id', 'name', 'email', 'phone', 'status'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['user_id', 'username', 'role'],
          },
        ],
      },
    ],
  });

  if (!team) {
    logger.warn(`Team not found: ID ${req.params.id}`);
    return next(new ErrorResponse('Team not found', 404));
  }

  logger.info(`Team fetched: ID ${team.team_id}`);

  return successResponse(res, team, 'Team fetched successfully');
});

// @desc    Update team name / description + optionally reassign employees
// @route   PUT /api/teams/:id
// @access  Admin
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { team_name, description, employee_ids } = req.body;

  const team = await Team.findByPk(req.params.id);

  if (!team) {
    logger.warn(`Update failed: Team not found (${req.params.id})`);
    return next(new ErrorResponse('Team not found', 404));
  }

  // Check name collision only if name is being changed
  if (team_name && team_name.trim() !== team.team_name) {
    const existing = await Team.findOne({ where: { team_name: team_name.trim() } });

    if (existing) {
      logger.warn(`Update failed: Team name already exists (${team_name})`);
      return next(new ErrorResponse('Team name already exists', 400));
    }
  }

  await sequelize.transaction(async (t) => {
    await team.update(
      {
        team_name: team_name ? team_name.trim() : team.team_name,
        description: description !== undefined ? description?.trim() || null : team.description,
      },
      { transaction: t }
    );

    // If employee_ids provided, replace current team members
    if (employee_ids?.length) {
      const employees = await Employee.findAll({
        where: { employee_id: employee_ids },
        transaction: t,
      });

      const foundIds = employees.map((e) => e.employee_id);
      const missingIds = employee_ids.filter((id) => !foundIds.includes(id));

      if (missingIds.length) {
        logger.warn(`Update team: employees not found (${missingIds})`);
        throw new ErrorResponse(`Employees not found: ${missingIds.join(', ')}`, 404);
      }

      // Unassign current members first
      await Employee.update(
        { team_id: null },
        { where: { team_id: team.team_id }, transaction: t }
      );

      // Assign new members
      await Employee.update(
        { team_id: team.team_id },
        { where: { employee_id: employee_ids }, transaction: t }
      );
    }
  });

  logger.info(`Team updated: ID ${team.team_id}`);

  return successResponse(res, team, 'Team updated successfully');
});

// @desc    Assign employees to team (additive — does not remove existing)
// @route   PATCH /api/teams/:id/assign
// @access  Admin
export const assignEmployeesToTeam = asyncHandler(async (req, res, next) => {
  const { employee_ids } = req.body;

  if (!employee_ids?.length) {
    return next(new ErrorResponse('employee_ids array is required', 400));
  }

  const team = await Team.findByPk(req.params.id);

  if (!team) {
    logger.warn(`Assign failed: Team not found (${req.params.id})`);
    return next(new ErrorResponse('Team not found', 404));
  }

  const employees = await Employee.findAll({ where: { employee_id: employee_ids } });

  const foundIds = employees.map((e) => e.employee_id);
  const missingIds = employee_ids.filter((id) => !foundIds.includes(id));

  if (missingIds.length) {
    logger.warn(`Assign failed: Employees not found (${missingIds})`);
    return next(new ErrorResponse(`Employees not found: ${missingIds.join(', ')}`, 404));
  }

  await Employee.update(
    { team_id: team.team_id },
    { where: { employee_id: employee_ids } }
  );

  logger.info(`Employees [${foundIds}] assigned to Team ID ${team.team_id}`);

  return successResponse(res, null, 'Employees assigned to team successfully');
});

// @desc    Delete team (unassigns employees, does not delete them)
// @route   DELETE /api/teams/:id
// @access  Admin
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findByPk(req.params.id);

  if (!team) {
    logger.warn(`Delete failed: Team not found (${req.params.id})`);
    return next(new ErrorResponse('Team not found', 404));
  }

  await sequelize.transaction(async (t) => {
    // Unassign all employees from this team before deleting
    await Employee.update(
      { team_id: null },
      { where: { team_id: team.team_id }, transaction: t }
    );

    await team.destroy({ transaction: t });
  });

  logger.info(`Team deleted: ID ${team.team_id}`);

  return successResponse(res, null, 'Team deleted successfully');
});