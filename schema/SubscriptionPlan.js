import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const SubscriptionPlan = sequelize.define(
  'SubscriptionPlan',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    planType: {
      type: DataTypes.ENUM('basic', 'premium', 'enterprise', 'custom', 'other'),
      allowNull: false,
      defaultValue: 'custom'
    },
    monthlyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    yearlyPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'NGN'
    },
    maxProperties: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    maxPhotosPerProperty: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    featuredProperties: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    prioritySupport: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    analyticsAccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    supportLevel: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    trialPeriodDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isRecommended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  },
  {
    tableName: 'subscription_plans',
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['planType']
      },
      {
        fields: ['isActive']
      }
    ]
  }
);

export default SubscriptionPlan;



