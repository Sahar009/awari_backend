import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import User from './User.js';

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Properties', // Use model name, Sequelize will resolve to correct table
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User, // Use the actual model - Sequelize will resolve to correct table
      key: 'id'
    }
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User, // Use the actual model - Sequelize will resolve to correct table
      key: 'id'
    }
  },
  bookingType: {
    type: DataTypes.ENUM('shortlet', 'rental', 'sale_inspection'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  // Dates
  checkInDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  checkOutDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  inspectionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  inspectionTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  
  // Duration
  numberOfNights: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  numberOfGuests: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  
  // Pricing
  basePrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'NGN'
  },
  serviceFee: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  
  // Payment
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Guest details
  guestName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  guestPhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  guestEmail: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  specialRequests: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Cancellation
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Notes
  ownerNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Metadata
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
  tableName: 'bookings'
});

// Define associations
Booking.associate = (models) => {
  // Booking belongs to Property
  Booking.belongsTo(models.Property, {
    foreignKey: 'propertyId',
    as: 'property'
  });

  // Booking belongs to User (who made the booking)
  Booking.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Booking belongs to User (property owner)
  Booking.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });

  // Booking belongs to User (who cancelled the booking)
  Booking.belongsTo(models.User, {
    foreignKey: 'cancelledBy',
    as: 'cancelledByUser'
  });
};

export default Booking;
