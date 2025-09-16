import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const PropertyAvailability = sequelize.define('PropertyAvailability', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reason: {
    type: DataTypes.ENUM('booking', 'maintenance', 'owner_blocked', 'admin_blocked', 'unavailable'),
    allowNull: false,
    defaultValue: 'unavailable'
  },
  bookingId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bookings',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'property_availability',
  indexes: [
    {
      unique: true,
      fields: ['propertyId', 'date']
    },
    {
      fields: ['propertyId', 'isActive']
    },
    {
      fields: ['date']
    }
  ]
});

// Define associations
PropertyAvailability.associate = (models) => {
  // PropertyAvailability belongs to Property
  PropertyAvailability.belongsTo(models.Property, {
    foreignKey: 'propertyId',
    as: 'property'
  });

  // PropertyAvailability belongs to Booking (if reason is booking)
  PropertyAvailability.belongsTo(models.Booking, {
    foreignKey: 'bookingId',
    as: 'booking'
  });

  // PropertyAvailability belongs to User (who created the availability record)
  PropertyAvailability.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

export default PropertyAvailability;

