import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  planId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'subscription_plans',
      key: 'id'
    }
  },
  planName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  planType: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise', 'custom', 'other'),
    defaultValue: 'basic',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'cancelled', 'expired', 'pending'),
    defaultValue: 'pending',
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  trialEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Plan features
  maxProperties: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  maxPhotosPerProperty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  featuredProperties: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  prioritySupport: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  analyticsAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Pricing
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
    defaultValue: 'NGN'
  },
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  
  // Billing
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'yearly', 'custom'),
    defaultValue: 'monthly'
  },
  nextBillingDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  autoRenew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Cancellation
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Metadata
  features: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'subscriptions'
});

export default Subscription;
