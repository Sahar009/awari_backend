import BookingFeeConfig from '../schema/BookingFeeConfig.js';
import { Op } from 'sequelize';

/**
 * Get all active booking fees (public endpoint)
 */
export const getActiveFees = async (req, res) => {
    try {
        const fees = await BookingFeeConfig.findAll({
            where: {
                isActive: true
            },
            order: [['feeType', 'ASC'], ['createdAt', 'DESC']],
            attributes: ['id', 'feeType', 'valueType', 'value', 'description']
        });

        res.status(200).json({
            success: true,
            data: fees
        });
    } catch (error) {
        console.error('Error fetching active fees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking fees',
            error: error.message
        });
    }
};

/**
 * Get all booking fees including inactive (admin only)
 */
export const getAllFees = async (req, res) => {
    try {
        const fees = await BookingFeeConfig.findAll({
            order: [['feeType', 'ASC'], ['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: fees
        });
    } catch (error) {
        console.error('Error fetching all fees:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking fees',
            error: error.message
        });
    }
};

/**
 * Create new fee configuration (admin only)
 */
export const createFee = async (req, res) => {
    try {
        const { feeType, valueType, value, isActive, description } = req.body;

        // Validation
        if (!feeType || !valueType || value === undefined || value === null) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: feeType, valueType, and value are required'
            });
        }

        // Validate fee type
        const validFeeTypes = ['service_fee', 'tax', 'platform_fee'];
        if (!validFeeTypes.includes(feeType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid feeType. Must be one of: ${validFeeTypes.join(', ')}`
            });
        }

        // Validate value type
        const validValueTypes = ['percentage', 'fixed'];
        if (!validValueTypes.includes(valueType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid valueType. Must be one of: ${validValueTypes.join(', ')}`
            });
        }

        // Validate value range
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            return res.status(400).json({
                success: false,
                message: 'Value must be a non-negative number'
            });
        }

        if (valueType === 'percentage' && numValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Percentage value cannot exceed 100'
            });
        }

        // If creating an active fee, deactivate existing active fees of the same type
        if (isActive !== false) {
            await BookingFeeConfig.update(
                { isActive: false },
                {
                    where: {
                        feeType,
                        isActive: true
                    }
                }
            );
        }

        const fee = await BookingFeeConfig.create({
            feeType,
            valueType,
            value: numValue,
            isActive: isActive !== false, // Default to true if not specified
            description: description || null
        });

        res.status(201).json({
            success: true,
            message: 'Fee configuration created successfully',
            data: fee
        });
    } catch (error) {
        console.error('Error creating fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create fee configuration',
            error: error.message
        });
    }
};

/**
 * Update fee configuration (admin only)
 */
export const updateFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { feeType, valueType, value, isActive, description } = req.body;

        const fee = await BookingFeeConfig.findByPk(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Fee configuration not found'
            });
        }

        // Validate value if provided
        if (value !== undefined && value !== null) {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Value must be a non-negative number'
                });
            }

            const targetValueType = valueType || fee.valueType;
            if (targetValueType === 'percentage' && numValue > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Percentage value cannot exceed 100'
                });
            }
        }

        // If activating this fee, deactivate other active fees of the same type
        if (isActive === true && !fee.isActive) {
            const targetFeeType = feeType || fee.feeType;
            await BookingFeeConfig.update(
                { isActive: false },
                {
                    where: {
                        feeType: targetFeeType,
                        isActive: true,
                        id: { [Op.ne]: id }
                    }
                }
            );
        }

        // Update fee
        const updateData = {};
        if (feeType !== undefined) updateData.feeType = feeType;
        if (valueType !== undefined) updateData.valueType = valueType;
        if (value !== undefined && value !== null) updateData.value = parseFloat(value);
        if (isActive !== undefined) updateData.isActive = isActive;
        if (description !== undefined) updateData.description = description;

        await fee.update(updateData);

        res.status(200).json({
            success: true,
            message: 'Fee configuration updated successfully',
            data: fee
        });
    } catch (error) {
        console.error('Error updating fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update fee configuration',
            error: error.message
        });
    }
};

/**
 * Delete fee configuration (admin only)
 */
export const deleteFee = async (req, res) => {
    try {
        const { id } = req.params;

        const fee = await BookingFeeConfig.findByPk(id);
        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Fee configuration not found'
            });
        }

        await fee.destroy();

        res.status(200).json({
            success: true,
            message: 'Fee configuration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting fee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete fee configuration',
            error: error.message
        });
    }
};

/**
 * Helper function to calculate booking fees based on base price
 * This can be used by booking services
 */
export const calculateBookingFees = async (basePrice) => {
    try {
        const fees = await BookingFeeConfig.findAll({
            where: {
                isActive: true
            }
        });

        let serviceFee = 0;
        let taxAmount = 0;
        let platformFee = 0;

        fees.forEach(fee => {
            const amount = fee.valueType === 'percentage'
                ? (basePrice * parseFloat(fee.value)) / 100
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
            }
        });

        return {
            serviceFee,
            taxAmount,
            platformFee,
            totalFees: serviceFee + taxAmount + platformFee
        };
    } catch (error) {
        console.error('Error calculating booking fees:', error);
        // Return default fees as fallback
        return {
            serviceFee: basePrice * 0.1, // 10%
            taxAmount: basePrice * 0.05, // 5%
            platformFee: 0,
            totalFees: basePrice * 0.15
        };
    }
};
