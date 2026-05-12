import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const RotationDetail = sequelize.define(
  'RotationDetail',
  {
    rotation_detail_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rotation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'rotation_cycles', key: 'rotation_id' },
    },
    day_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Day position within the cycle (1..cycle_length)',
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'teams', key: 'team_id' },
    },
    shift_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'shifts', key: 'shift_id' },
    },
  },
  {
    tableName: 'rotation_details',
    timestamps: false,
    indexes: [
      {
        // One team per day per cycle
        unique: true,
        fields: ['rotation_id', 'day_number', 'team_id'],
        name: 'uq_rotation_day_team',
      },
      {
        // One team per shift per day per cycle
        unique: true,
        fields: ['rotation_id', 'day_number', 'shift_id'],
        name: 'uq_rotation_day_shift',
      },
    ],
  }
);