import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const KycDocument = sequelize.define('KycDocument', {
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
  documentType: {
    type: DataTypes.ENUM('passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'),
    allowNull: false
  },
  documentNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  documentUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  documentThumbnail: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  verificationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'kyc_documents'
});

export default KycDocument;
