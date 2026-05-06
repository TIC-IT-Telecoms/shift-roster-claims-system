import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PublicHoliday = sequelize.define(
  'PublicHoliday',
  {
    holiday_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    holiday_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    holiday_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
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
    tableName: 'public_holidays',
    timestamps: false,
  }
);
