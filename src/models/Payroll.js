import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Payroll = sequelize.define(
  'Payroll',
  {
    payroll_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
    },
    pay_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    pay_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    normal_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    overtime_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    holiday_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    grave_allowance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    total_pay: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    generated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    generated_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Admin user_id',
      references: { model: 'users', key: 'user_id' },
    },
  },
  {
    tableName: 'payrolls',
    timestamps: false,
  }
);
