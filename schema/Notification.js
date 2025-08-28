import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const Notification = sequelize.define('Notification', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  type: {
    type: DataTypes.ENUM('info', 'success', 'warning', 'error', 'reminder', 'announcement'),
    defaultValue: 'info',
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('booking', 'payment', 'property', 'message', 'system', 'reminder'),
    defaultValue: 'system',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('unread', 'read', 'archived'),
    defaultValue: 'unread',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  actionText: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Related entities
  propertyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'properties',
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
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  
  // Delivery
  channels: {
    type: DataTypes.JSON, // ['email', 'sms', 'push', 'in_app']
    allowNull: false,
    comment: 'Array of notification channels stored as JSON'
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  smsSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pushSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  data: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'notifications'
});

export default Notification;
