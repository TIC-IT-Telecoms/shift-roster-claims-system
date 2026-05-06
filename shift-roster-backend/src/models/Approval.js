import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Approval = sequelize.define(
  'Approval',
  {
    approval_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    claim_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'claims', key: 'claim_id' },
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Admin user_id',
      references: { model: 'users', key: 'user_id' },
    },
    status: {
      type: DataTypes.ENUM('Approved', 'Rejected'),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    approved_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'approvals',
    timestamps: false,
  }
);
