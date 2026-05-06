// ─── Models ──────────────────────────────────────────────────────────────────
export { Team }            from './Team.js';
export { Employee }        from './Employee.js';
export { User }            from './User.js';
export { Shift }           from './Shift.js';
export { RotationCycle }   from './RotationCycle.js';
export { RotationDetail }  from './RotationDetail.js';
export { Roster }          from './Roster.js';
export { Claim }           from './Claim.js';
export { Approval }        from './Approval.js';
export { Payroll }         from './Payroll.js';
export { PublicHoliday }   from './PublicHoliday.js';
export { ComplianceFlag }  from './ComplianceFlag.js';

// ─── Import all models to define associations ────────────────────────────────
import { Team }            from './Team.js';
import { Employee }        from './Employee.js';
import { User }            from './User.js';
import { Shift }           from './Shift.js';
import { RotationCycle }   from './RotationCycle.js';
import { RotationDetail }  from './RotationDetail.js';
import { Roster }          from './Roster.js';
import { Claim }           from './Claim.js';
import { Approval }        from './Approval.js';
import { Payroll }         from './Payroll.js';
import { ComplianceFlag }  from './ComplianceFlag.js';

// ─── Associations ─────────────────────────────────────────────────────────────

// Team ←→ Employee  (1 : N)
Team.hasMany(Employee,       { foreignKey: 'team_id', as: 'employees' });
Employee.belongsTo(Team,     { foreignKey: 'team_id', as: 'team' });

// Employee ←→ User  (1 : 1)
Employee.hasOne(User,        { foreignKey: 'employee_id', as: 'user' });
User.belongsTo(Employee,     { foreignKey: 'employee_id', as: 'employee' });

// Employee ←→ Roster  (1 : N)
Employee.hasMany(Roster,     { foreignKey: 'employee_id', as: 'rosters' });
Roster.belongsTo(Employee,   { foreignKey: 'employee_id', as: 'employee' });

// Shift ←→ Roster  (1 : N)
Shift.hasMany(Roster,        { foreignKey: 'shift_id', as: 'rosters' });
Roster.belongsTo(Shift,      { foreignKey: 'shift_id', as: 'shift' });

// Employee ←→ Claim  (1 : N)
Employee.hasMany(Claim,      { foreignKey: 'employee_id', as: 'claims' });
Claim.belongsTo(Employee,    { foreignKey: 'employee_id', as: 'employee' });

// Claim ←→ Approval  (1 : 1)
Claim.hasOne(Approval,       { foreignKey: 'claim_id', as: 'approval' });
Approval.belongsTo(Claim,    { foreignKey: 'claim_id', as: 'claim' });

// User ←→ Approval  (1 : N)  — admin who approved
User.hasMany(Approval,       { foreignKey: 'approved_by', as: 'approvals' });
Approval.belongsTo(User,     { foreignKey: 'approved_by', as: 'approvedBy' });

// Employee ←→ Payroll  (1 : N)
Employee.hasMany(Payroll,    { foreignKey: 'employee_id', as: 'payrolls' });
Payroll.belongsTo(Employee,  { foreignKey: 'employee_id', as: 'employee' });

// User ←→ Payroll  (1 : N)  — admin who generated
User.hasMany(Payroll,        { foreignKey: 'generated_by', as: 'generatedPayrolls' });
Payroll.belongsTo(User,      { foreignKey: 'generated_by', as: 'generatedBy' });

// RotationCycle ←→ RotationDetail  (1 : N)
RotationCycle.hasMany(RotationDetail,    { foreignKey: 'rotation_id', as: 'details' });
RotationDetail.belongsTo(RotationCycle, { foreignKey: 'rotation_id', as: 'cycle' });

// Team ←→ RotationDetail  (1 : N)
Team.hasMany(RotationDetail,            { foreignKey: 'team_id', as: 'rotationDetails' });
RotationDetail.belongsTo(Team,          { foreignKey: 'team_id', as: 'team' });

// Shift ←→ RotationDetail  (1 : N)
Shift.hasMany(RotationDetail,           { foreignKey: 'shift_id', as: 'rotationDetails' });
RotationDetail.belongsTo(Shift,         { foreignKey: 'shift_id', as: 'shift' });

// Employee ←→ ComplianceFlag  (1 : N)
Employee.hasMany(ComplianceFlag,        { foreignKey: 'employee_id', as: 'complianceFlags' });
ComplianceFlag.belongsTo(Employee,      { foreignKey: 'employee_id', as: 'employee' });
