import { DataTypes, Op } from 'sequelize';
import sequelize from '../database/db.js';

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  paystackCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Paystack customer ID'
  },
  paystackCustomerCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Paystack customer code'
  },
  walletAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'User-friendly wallet address for transfers (e.g., paystack/awari/username-walletid)'
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Paystack dedicated virtual account number'
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Paystack dedicated virtual account name'
  },
  bankName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Bank name for the dedicated virtual account'
  },
  bankCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Bank code for the dedicated virtual account'
  },
  availableBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: 'Available balance that can be withdrawn'
  },
  pendingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: 'Pending balance locked until booking check-in'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'NGN',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'closed'),
    defaultValue: 'active',
    allowNull: false
  },
  lastTransactionAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last transaction timestamp'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional wallet metadata'
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
  tableName: 'wallets',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId']
    },
    {
      unique: true,
      fields: ['paystackCustomerCode'],
      where: {
        paystackCustomerCode: {
          [Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['walletAddress'],
      where: {
        walletAddress: {
          [Op.ne]: null
        }
      }
    },
    {
      fields: ['status']
    }
  ]
});

export default Wallet;
