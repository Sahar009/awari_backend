import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true, // Allow null for Google-only users
    validate: {
      notEmpty: function(value) {
        // Password is required only if no Google ID
        if (!this.googleId && !value) {
          throw new Error('Password is required for non-Google accounts');
        }
      }
    }
  },
  googleId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('renter', 'buyer', 'landlord', 'agent', 'hotel_provider', 'admin'),
    defaultValue: 'renter',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'banned', 'deleted'),
    defaultValue: 'pending',
    allowNull: false
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationCode: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  accountDeletionToken: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  accountDeletionExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  kycVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profileCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  socialLinks: {
    type: DataTypes.JSON,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSON,
    allowNull: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  paranoid: true, // Enable soft deletes
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
      // Set email verification expiry to 10 minutes from now
      if (user.emailVerificationCode) {
        user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
    },
    beforeValidate: (user) => {
      // Ensure at least one authentication method exists
      if (!user.passwordHash && !user.googleId) {
        throw new Error('User must have either a password or Google ID');
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to get full name
User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if verification code is expired
User.prototype.isVerificationCodeExpired = function() {
  if (!this.emailVerificationExpires) return true;
  return new Date() > this.emailVerificationExpires;
};

// Instance method to check if password reset token is expired
User.prototype.isPasswordResetExpired = function() {
  if (!this.passwordResetExpires) return true;
  return new Date() > this.passwordResetExpires;
};

// Instance method to check if account deletion token is expired
User.prototype.isAccountDeletionExpired = function() {
  if (!this.accountDeletionExpires) return true;
  return new Date() > this.accountDeletionExpires;
};

// Instance method to check if user has password authentication
User.prototype.hasPasswordAuth = function() {
  return !!this.passwordHash;
};

// Instance method to check if user has Google authentication
User.prototype.hasGoogleAuth = function() {
  return !!this.googleId;
};

// Instance method to check if user is Google-only (no password)
User.prototype.isGoogleOnly = function() {
  return !this.passwordHash && !!this.googleId;
};

export default User;
