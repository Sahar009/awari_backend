import { DataTypes } from 'sequelize';
import sequelize from '../database/db.js';

const BookingFeeConfig = sequelize.define('BookingFeeConfig', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    feeType: {
        type: DataTypes.ENUM('service_fee', 'tax', 'platform_fee'),
        allowNull: false,
        comment: 'Type of fee: service_fee, tax, or platform_fee',
    },
    valueType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Whether the fee is a percentage or fixed amount',
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
            max: 100, // For percentage, max is 100%
        },
        comment: 'Fee value - percentage (0-100) or fixed amount in NGN',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this fee configuration is currently active',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes about this fee configuration',
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
    tableName: 'booking_fee_configs',
    timestamps: true,
    indexes: [
        {
            fields: ['feeType', 'isActive'],
            name: 'idx_fee_type_active',
        },
        {
            fields: ['isActive'],
            name: 'idx_is_active',
        },
    ],
});

export default BookingFeeConfig;
