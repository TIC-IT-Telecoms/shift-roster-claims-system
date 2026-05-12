// models/Roster.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Roster = sequelize.define(
  'Roster',
  {
    roster_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'employees', key: 'employee_id' },
    },
    shift_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null = Off day
      references: { model: 'shifts', key: 'shift_id' },
    },
    roster_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    is_public_holiday: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('Scheduled', 'Off', 'Holiday'),
      defaultValue: 'Scheduled',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'rosters',
    timestamps: false,
    indexes: [
      {
        // One roster entry per employee per date
        unique: true,
        fields: ['employee_id', 'roster_date'],
        name: 'uq_employee_roster_date',
      },
    ],
  }
);