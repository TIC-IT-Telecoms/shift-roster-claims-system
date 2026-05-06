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
      allowNull: false,
      references: { model: 'shifts', key: 'shift_id' },
    },
    roster_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'rosters',
    timestamps: false,
  }
);
