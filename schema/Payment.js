import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import User from './User.js';

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'NGN',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('booking', 'subscription', 'service_fee', 'refund', 'payout'),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'bank_transfer','paystack'),
    allowNull: false
  },
  gateway: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Fee breakdown
  processingFee: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  couponCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Refund details
  refundAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refundedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  
  // Payout details (for owners)
  payoutAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  payoutStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    allowNull: true
  },
  payoutMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  payoutDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Metadata
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'payments'
});

export default Payment;
