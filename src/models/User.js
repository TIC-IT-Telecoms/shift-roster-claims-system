import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const User = sequelize.define(
  'User',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'employees', key: 'employee_id' },
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('Admin', 'Employee'),
      allowNull: false,
      defaultValue: 'Employee',
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // ===== PASSWORD RESET LIFECYCLE TRACKING FIELDS =====
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_expires: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    // ===== MULTI-FACTOR AUTHENTICATION TRACKING FIELDS (OPTIONAL ALTERNATIVE) =====
    otp_secret_token: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    otp_token_expires: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    timestamps: false,
  }
);
