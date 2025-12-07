import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import User from './User.js';

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  agentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  slug: {
    type: DataTypes.STRING(300),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  propertyType: {
    type: DataTypes.ENUM('apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'),
    allowNull: false
  },
  listingType: {
    type: DataTypes.ENUM('rent', 'sale', 'shortlet', 'hotel'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'rejected', 'archived'),
    defaultValue: 'draft',
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'NGN'
  },
  pricePeriod: {
    type: DataTypes.ENUM('per_night', 'per_month', 'per_year', 'one_time'),
    allowNull: true
  },
  negotiable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Location details
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  postalCode: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  neighborhood: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  landmark: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Property details
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  toilets: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  parkingSpaces: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  floorArea: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true
  },
  landArea: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  totalFloors: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  yearBuilt: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  conditionStatus: {
    type: DataTypes.ENUM('new', 'excellent', 'good', 'fair', 'needs_renovation'),
    allowNull: true
  },
  
  // Features and amenities
  features: {
    type: DataTypes.JSON,
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  petFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  smokingAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  furnished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Availability
  availableFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  availableUntil: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  minLeasePeriod: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  maxLeasePeriod: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Shortlet specific
  minStayNights: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  maxStayNights: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  instantBooking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cancellationPolicy: {
    type: DataTypes.ENUM('flexible', 'moderate', 'strict', 'super_strict'),
    defaultValue: 'moderate'
  },
  
  // SEO and visibility
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  featuredUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  favoriteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  contactCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Approval and moderation
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  moderationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Metadata
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tag strings stored as JSON'
  },
  seoTitle: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  seoDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  seoKeywords: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of SEO keywords stored as JSON'
  }
}, {
  timestamps: true,
  tableName: 'properties'
});

export default Property;
