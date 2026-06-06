import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Notification = sequelize.define(
  'Notification',
  {
    notification_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'user_id' },
    },
    type: {
      type: DataTypes.ENUM(
        'claim_submitted',
        'claim_approved',
        'claim_rejected',
        'claim_reset',
        'roster_published',
        'holiday_alert',
        'payslip_available',
        'system'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    reference_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of related entity (claim_id, roster_id etc.)',
    },
    reference_type: {
      type: DataTypes.ENUM('claim', 'roster', 'holiday', 'payroll'),
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'notifications',
    timestamps: false,
    indexes: [
      { fields: ['user_id', 'is_read'] },
      { fields: ['user_id', 'created_at'] },
    ],
  }
);