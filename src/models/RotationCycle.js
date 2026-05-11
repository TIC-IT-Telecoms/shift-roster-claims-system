import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const RotationCycle = sequelize.define(
  'RotationCycle',
  {
    rotation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cycle_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    cycle_length: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Number of days in the rotation cycle',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date from which cycle day resolution begins — drives auto-loop',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'rotation_cycles',
    timestamps: false,
  }
);