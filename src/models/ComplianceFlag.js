import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ComplianceFlag = sequelize.define(
  'ComplianceFlag',
  {
    compliance_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
    },
    flag_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    rule_violated: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM('High', 'Medium', 'Low'),
      allowNull: false,
      defaultValue: 'Low',
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'compliance_flags',
    timestamps: false,
  }
);
