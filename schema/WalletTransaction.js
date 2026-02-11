import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const WalletTransaction = sequelize.define('WalletTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'wallets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  type: {
    type: DataTypes.ENUM(
      'credit',
      'debit',
      'refund',
      'withdrawal',
      'transfer_in',
      'transfer_out'
    ),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
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
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Total wallet balance before transaction'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Total wallet balance after transaction'
  },
  availableBalanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Available balance before transaction'
  },
  availableBalanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Available balance after transaction'
  },
  pendingBalanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Pending balance before transaction'
  },
  pendingBalanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: 'Pending balance after transaction'
  },
  releaseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date when pending funds will be released to available'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique transaction reference'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Transaction description'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Payment method used'
  },
  paystackReference: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Paystack transaction reference'
  },
  relatedTransactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Related transaction ID'
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Related booking ID'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional transaction metadata'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'wallet_transactions',
  timestamps: true,
  indexes: [
    { fields: ['walletId'] },
    { fields: ['userId'] },
    { unique: true, fields: ['reference'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['paystackReference'] },
    { fields: ['bookingId'] },
    { fields: ['createdAt'] }
  ]
});

export default WalletTransaction;
