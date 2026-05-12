import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Team = sequelize.define(
  'Team',
  {
    team_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    team_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'teams',
    timestamps: false,
  }
);
