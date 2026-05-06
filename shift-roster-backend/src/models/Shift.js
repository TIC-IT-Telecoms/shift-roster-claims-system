import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Shift = sequelize.define(
  'Shift',
  {
    shift_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shift_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    is_grave: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'shifts',
    timestamps: false,
  }
);
