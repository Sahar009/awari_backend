import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const BookingConfig = sequelize.define('BookingConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Configuration key, e.g. auto_cancel_hours, max_pending_bookings',
    },
    value: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Configuration value (stored as string, parsed by consumer)',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable description of this configuration',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this configuration is currently active',
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Admin user ID who last updated this config',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'booking_configs',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['key'],
            name: 'idx_booking_config_key',
        },
        {
            fields: ['isActive'],
            name: 'idx_booking_config_active',
        },
    ],
});

/**
 * Helper to get a config value by key with a default fallback
 * @param {string} key - Config key
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Config value
 */
BookingConfig.getValue = async (key, defaultValue = null) => {
    try {
        const config = await BookingConfig.findOne({
            where: { key, isActive: true }
        });
        return config ? config.value : defaultValue;
    } catch (error) {
        console.error(`Error fetching booking config '${key}':`, error);
        return defaultValue;
    }
};

/**
 * Helper to get a numeric config value
 * @param {string} key - Config key
 * @param {number} defaultValue - Default numeric value
 * @returns {number} Config value as number
 */
BookingConfig.getNumericValue = async (key, defaultValue = 0) => {
    const value = await BookingConfig.getValue(key, String(defaultValue));
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

export default BookingConfig;
