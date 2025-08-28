import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const PropertyMedia = sequelize.define('PropertyMedia', {
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
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'document'),
    defaultValue: 'image',
    allowNull: false
  },
  url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  size: {
    type: DataTypes.BIGINT, // in bytes
    allowNull: true
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds for videos
    allowNull: true
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  altText: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'property_media'
});

export default PropertyMedia;
