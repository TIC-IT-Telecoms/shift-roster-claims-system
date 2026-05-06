import { Team } from './Team.js';
import { Employee } from './Employee.js';
import { User } from './User.js';
import { Shift } from './Shift.js';
import { RotationCycle } from './RotationCycle.js';
import { RotationDetail } from './RotationDetail.js';
import { Roster } from './Roster.js';
import { Claim } from './Claim.js';
import { Approval } from './Approval.js';
import { Payroll } from './Payroll.js';
import { ComplianceFlag } from './ComplianceFlag.js';

export const defineAssociations = () => {
  // Team -> Employee
  Team.hasMany(Employee, { foreignKey: 'team_id', as: 'employees' });
  Employee.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

  // Employee ←→ User
  Employee.hasOne(User, { foreignKey: 'employee_id', as: 'user' });
  User.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // Employee-> Roster
  Employee.hasMany(Roster, { foreignKey: 'employee_id', as: 'rosters' });
  Roster.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // Shift-> Roster
  Shift.hasMany(Roster, { foreignKey: 'shift_id', as: 'rosters' });
  Roster.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

  // Employee-> Claim
  Employee.hasMany(Claim, { foreignKey: 'employee_id', as: 'claims' });
  Claim.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // Claim-> Approval
  Claim.hasOne(Approval, { foreignKey: 'claim_id', as: 'approval' });
  Approval.belongsTo(Claim, { foreignKey: 'claim_id', as: 'claim' });

  // User-> Approval
  User.hasMany(Approval, { foreignKey: 'approved_by', as: 'approvals' });
  Approval.belongsTo(User, { foreignKey: 'approved_by', as: 'approvedBy' });

  // Employee-> Payroll
  Employee.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
  Payroll.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

  // User-> Payroll
  User.hasMany(Payroll, { foreignKey: 'generated_by', as: 'generatedPayrolls' });
  Payroll.belongsTo(User, { foreignKey: 'generated_by', as: 'generatedBy' });

  // RotationCycle-> RotationDetail
  RotationCycle.hasMany(RotationDetail, { foreignKey: 'rotation_id', as: 'details' });
  RotationDetail.belongsTo(RotationCycle, { foreignKey: 'rotation_id', as: 'cycle' });

  // Team-> RotationDetail
  Team.hasMany(RotationDetail, { foreignKey: 'team_id', as: 'rotationDetails' });
  RotationDetail.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

  // Shift-> RotationDetail
  Shift.hasMany(RotationDetail, { foreignKey: 'shift_id', as: 'rotationDetails' });
  RotationDetail.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

  // Employee-> ComplianceFlag
  Employee.hasMany(ComplianceFlag, { foreignKey: 'employee_id', as: 'complianceFlags' });
  ComplianceFlag.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
};