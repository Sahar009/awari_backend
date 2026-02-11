import Property from '../schema/Property.js';
import PropertyAvailability from '../schema/PropertyAvailability.js';
import Booking from '../schema/Booking.js';

/**
 * Get property availability for a date range
 * @param {string} propertyId - Property ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Availability data
 */
export const getPropertyAvailability = async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify property exists
        const property = await Property.findByPk(propertyId);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found'
            });
        }

        // Build query conditions
        const whereConditions = {
            propertyId,
            isActive: true
        };

        if (startDate && endDate) {
            whereConditions.date = {
                $between: [startDate, endDate]
            };
        } else if (startDate) {
            whereConditions.date = {
                $gte: startDate
            };
        } else if (endDate) {
            whereConditions.date = {
                $lte: endDate
            };
        }

        // Fetch availability records
        const availability = await PropertyAvailability.findAll({
            where: whereConditions,
            include: [
                {
                    model: Booking,
                    as: 'booking',
                    attributes: ['id', 'guestName', 'bookingType', 'status'],
                    required: false
                }
            ],
            order: [['date', 'ASC']]
        });

        return res.status(200).json({
            success: true,
            data: availability
        });
    } catch (error) {
        console.error('❌ Error fetching property availability:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch property availability',
            error: error.message
        });
    }
};

export default {
    getPropertyAvailability
};
