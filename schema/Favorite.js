import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import User from './User.js';
import Property from './Property.js';

const Favorite = sequelize.define('Favorite', {
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
  propertyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Property,
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
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'favorites',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'propertyId'],
      where: {
        isActive: true
      }
    }
  ]
});

export default Favorite;
