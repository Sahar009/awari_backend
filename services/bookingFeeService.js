import BookingFeeConfig from '../schema/BookingFeeConfig.js';
import { Op } from 'sequelize';

/**
 * Booking Fee Service
 * Centralized service for calculating booking fees based on property type and base price
 */

class BookingFeeService {
    /**
     * Calculate fees for a booking
     * @param {number} basePrice - Base booking price
     * @param {string} propertyType - Property type (shortlet, hotel, rent, sale)
     * @returns {Object} Fee breakdown
     */
    async calculateFees(basePrice, propertyType = 'shortlet') {
        try {
            const price = parseFloat(basePrice);

            if (isNaN(price) || price <= 0) {
                throw new Error('Invalid base price');
            }

            // Fetch active fees for this property type
            const fees = await BookingFeeConfig.findAll({
                where: {
                    isActive: true,
                    [Op.or]: [
                        { propertyType: propertyType },
                        { propertyType: null } // Applies to all types
                    ]
                }
            });

            let serviceFee = 0;
            let taxAmount = 0;
            let platformFee = 0;
            let agencyFee = 0;

            // Calculate each fee type
            fees.forEach(fee => {
                const amount = fee.valueType === 'percentage'
                    ? (price * parseFloat(fee.value)) / 100
                    : parseFloat(fee.value);

                switch (fee.feeType) {
                    case 'service_fee':
                        serviceFee += amount;
                        break;
                    case 'tax':
                        taxAmount += amount;
                        break;
                    case 'platform_fee':
                        platformFee += amount;
                        break;
                    case 'agency_fee':
                        agencyFee += amount;
                        break;
                }
            });

            const totalFees = serviceFee + taxAmount + platformFee + agencyFee;
            const netAmount = price - totalFees;

            return {
                serviceFee: Math.round(serviceFee * 100) / 100,
                taxAmount: Math.round(taxAmount * 100) / 100,
                platformFee: Math.round(platformFee * 100) / 100,
                agencyFee: Math.round(agencyFee * 100) / 100,
                totalFees: Math.round(totalFees * 100) / 100,
                netAmount: Math.round(netAmount * 100) / 100,
                grossAmount: price
            };
        } catch (error) {
            console.error('❌ Error calculating booking fees:', error);

            // Return default fees as fallback (5% service + 2% tax)
            const defaultServiceFee = basePrice * 0.05;
            const defaultTax = basePrice * 0.02;
            const defaultTotal = defaultServiceFee + defaultTax;

            return {
                serviceFee: Math.round(defaultServiceFee * 100) / 100,
                taxAmount: Math.round(defaultTax * 100) / 100,
                platformFee: 0,
                agencyFee: 0,
                totalFees: Math.round(defaultTotal * 100) / 100,
                netAmount: Math.round((basePrice - defaultTotal) * 100) / 100,
                grossAmount: basePrice
            };
        }
    }

    /**
     * Get active fee configurations for a property type
     * @param {string} propertyType - Property type
     * @returns {Array} Active fee configurations
     */
    async getActiveFees(propertyType = null) {
        try {
            const where = { isActive: true };

            if (propertyType) {
                where[Op.or] = [
                    { propertyType: propertyType },
                    { propertyType: null }
                ];
            }

            const fees = await BookingFeeConfig.findAll({
                where,
                order: [['feeType', 'ASC'], ['createdAt', 'DESC']]
            });

            return fees;
        } catch (error) {
            console.error('❌ Error fetching active fees:', error);
            return [];
        }
    }

    /**
     * Calculate fee breakdown with descriptions
     * @param {number} basePrice - Base booking price
     * @param {string} propertyType - Property type
     * @returns {Object} Detailed fee breakdown
     */
    async calculateDetailedFees(basePrice, propertyType = 'shortlet') {
        const fees = await this.calculateFees(basePrice, propertyType);
        const configs = await this.getActiveFees(propertyType);

        const breakdown = [];

        configs.forEach(config => {
            const amount = config.valueType === 'percentage'
                ? (basePrice * parseFloat(config.value)) / 100
                : parseFloat(config.value);

            breakdown.push({
                type: config.feeType,
                description: config.description || config.feeType.replace('_', ' '),
                valueType: config.valueType,
                value: parseFloat(config.value),
                amount: Math.round(amount * 100) / 100
            });
        });

        return {
            ...fees,
            breakdown
        };
    }
}

export default new BookingFeeService();
