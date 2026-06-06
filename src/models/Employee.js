import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Employee = sequelize.define(
  'Employee',
  {
    employee_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'teams', key: 'team_id' },
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
    },

    employment_type: {
      type: DataTypes.ENUM('Full Time', 'Part Time', 'Contract', 'Intern'),
      allowNull: true,
      defaultValue: 'Full Time',
    },
    id_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'National ID / Passport number',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    position: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    supervisor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'employees', key: 'employee_id' },
      comment: 'Self-referencing FK — points to another employee',
    },
    // profile_picture: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    // },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_DATE'),
    },
  },
  {
    tableName: 'employees',
    timestamps: false,
  }
);