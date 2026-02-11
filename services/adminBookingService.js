import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import User from '../schema/User.js';
import Payment from '../schema/Payment.js';
import WalletTransaction from '../schema/WalletTransaction.js';
import PropertyAvailability from '../schema/PropertyAvailability.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';

/**
 * Admin Booking Service
 * Provides comprehensive booking management for administrators
 */

class AdminBookingService {
    /**
     * Get all bookings with advanced filtering, search, and pagination
     * @param {Object} filters - Filter criteria
     * @param {Object} pagination - Pagination options
     * @param {Object} sort - Sorting options
     * @returns {Object} Bookings list with metadata
     */
    async getAllBookings(filters = {}, pagination = {}, sort = {}) {
        try {
            const {
                status,
                paymentStatus,
                walletStatus,
                bookingType,
                propertyId,
                userId,
                ownerId,
                search,
                checkInFrom,
                checkInTo,
                checkOutFrom,
                checkOutTo,
                createdFrom,
                createdTo
            } = filters;

            const {
                page = 1,
                limit = 20
            } = pagination;

            const {
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            } = sort;

            // Build where clause
            const where = {};

            if (status) {
                where.status = Array.isArray(status) ? { [Op.in]: status } : status;
            }

            if (paymentStatus) {
                where.paymentStatus = Array.isArray(paymentStatus) ? { [Op.in]: paymentStatus } : paymentStatus;
            }

            if (walletStatus) {
                where.walletStatus = Array.isArray(walletStatus) ? { [Op.in]: walletStatus } : walletStatus;
            }

            if (bookingType) {
                where.bookingType = Array.isArray(bookingType) ? { [Op.in]: bookingType } : bookingType;
            }

            if (propertyId) {
                where.propertyId = propertyId;
            }

            if (userId) {
                where.userId = userId;
            }

            if (ownerId) {
                where.ownerId = ownerId;
            }

            // Date filters
            if (checkInFrom || checkInTo) {
                where.checkInDate = {};
                if (checkInFrom) where.checkInDate[Op.gte] = new Date(checkInFrom);
                if (checkInTo) where.checkInDate[Op.lte] = new Date(checkInTo);
            }

            if (checkOutFrom || checkOutTo) {
                where.checkOutDate = {};
                if (checkOutFrom) where.checkOutDate[Op.gte] = new Date(checkOutFrom);
                if (checkOutTo) where.checkOutDate[Op.lte] = new Date(checkOutTo);
            }

            if (createdFrom || createdTo) {
                where.createdAt = {};
                if (createdFrom) where.createdAt[Op.gte] = new Date(createdFrom);
                if (createdTo) where.createdAt[Op.lte] = new Date(createdTo);
            }

            // Search
            if (search) {
                where[Op.or] = [
                    { id: { [Op.like]: `%${search}%` } },
                    { guestName: { [Op.like]: `%${search}%` } },
                    { guestEmail: { [Op.like]: `%${search}%` } },
                    { guestPhone: { [Op.like]: `%${search}%` } }
                ];
            }

            // Calculate offset
            const offset = (page - 1) * limit;

            // Fetch bookings with relations
            const { count, rows: bookings } = await Booking.findAndCountAll({
                where,
                include: [
                    {
                        model: Property,
                        as: 'property',
                        attributes: ['id', 'title', 'propertyType', 'address', 'city', 'state'],
                        required: search ? true : false,
                        where: search ? {
                            [Op.or]: [
                                { title: { [Op.like]: `%${search}%` } },
                                { address: { [Op.like]: `%${search}%` } }
                            ]
                        } : undefined
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
                    },
                    {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
                    }
                ],
                order: [[sortBy, sortOrder]],
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true
            });

            return {
                success: true,
                data: {
                    bookings,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit)
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error fetching bookings for admin:', error);
            return {
                success: false,
                message: 'Failed to fetch bookings',
                error: error.message
            };
        }
    }

    /**
     * Get detailed booking information for admin
     * @param {string} bookingId - Booking ID
     * @returns {Object} Detailed booking data
     */
    async getBookingDetails(bookingId) {
        try {
            const booking = await Booking.findByPk(bookingId, {
                include: [
                    {
                        model: Property,
                        as: 'property',
                        include: [
                            {
                                model: User,
                                as: 'owner',
                                attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'role']
                            }
                        ]
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'role']
                    },
                    {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'role']
                    }
                ]
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found',
                    statusCode: 404
                };
            }

            // Get payment information
            const payment = await Payment.findOne({
                where: { bookingId: booking.id },
                order: [['createdAt', 'DESC']]
            });

            // Get wallet transaction if exists
            let walletTransaction = null;
            if (booking.walletTransactionId) {
                walletTransaction = await WalletTransaction.findByPk(booking.walletTransactionId);
            }

            return {
                success: true,
                data: {
                    booking,
                    payment,
                    walletTransaction
                }
            };
        } catch (error) {
            console.error('❌ Error fetching booking details:', error);
            return {
                success: false,
                message: 'Failed to fetch booking details',
                error: error.message
            };
        }
    }

    /**
     * Update booking as admin
     * @param {string} bookingId - Booking ID
     * @param {Object} updates - Fields to update
     * @param {string} adminId - Admin user ID
     * @returns {Object} Updated booking
     */
    async updateBooking(bookingId, updates, adminId) {
        try {
            const booking = await Booking.findByPk(bookingId);

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found',
                    statusCode: 404
                };
            }

            // Allowed fields for admin update
            const allowedFields = [
                'status',
                'paymentStatus',
                'checkInDate',
                'checkOutDate',
                'numberOfGuests',
                'guestName',
                'guestEmail',
                'guestPhone',
                'specialRequests',
                'basePrice',
                'serviceFee',
                'taxAmount',
                'totalPrice'
            ];

            const updateData = {};
            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            // Add admin metadata
            updateData.metadata = {
                ...booking.metadata,
                lastUpdatedBy: adminId,
                lastUpdatedAt: new Date(),
                adminUpdates: [
                    ...(booking.metadata?.adminUpdates || []),
                    {
                        adminId,
                        timestamp: new Date(),
                        changes: updateData
                    }
                ]
            };

            await booking.update(updateData);

            return {
                success: true,
                message: 'Booking updated successfully',
                data: booking
            };
        } catch (error) {
            console.error('❌ Error updating booking:', error);
            return {
                success: false,
                message: 'Failed to update booking',
                error: error.message
            };
        }
    }

    /**
     * Approve a pending booking
     * @param {string} bookingId - Booking ID
     * @param {string} adminId - Admin user ID
     * @returns {Object} Approved booking
     */
    async approveBooking(bookingId, adminId) {
        const transaction = await sequelize.transaction();

        try {
            const booking = await Booking.findByPk(bookingId, { transaction });

            if (!booking) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Booking not found',
                    statusCode: 404
                };
            }

            if (booking.status !== 'pending') {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Only pending bookings can be approved',
                    statusCode: 400
                };
            }

            // Update booking status
            await booking.update({
                status: 'confirmed',
                approvedBy: adminId,
                approvedAt: new Date()
            }, { transaction });

            // Create PropertyAvailability records for booked dates
            // Only for shortlet and hotel bookings (not inspections)
            if (booking.bookingType !== 'sale_inspection' && booking.checkInDate && booking.checkOutDate) {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);

                const availabilityRecords = [];
                const currentDate = new Date(checkIn);

                // Create a record for each day from check-in to check-out (inclusive)
                while (currentDate <= checkOut) {
                    availabilityRecords.push({
                        propertyId: booking.propertyId,
                        date: currentDate.toISOString().split('T')[0],
                        reason: 'booking',
                        bookingId: booking.id,
                        isActive: true,
                        createdBy: adminId
                    });
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                // Bulk create availability records (ignore duplicates)
                if (availabilityRecords.length > 0) {
                    await PropertyAvailability.bulkCreate(availabilityRecords, {
                        transaction,
                        ignoreDuplicates: true // Skip if date already exists for property
                    });

                    console.log(`✅ Created ${availabilityRecords.length} availability records for booking ${bookingId}`);
                }
            }

            await transaction.commit();

            return {
                success: true,
                message: 'Booking approved successfully',
                data: booking
            };
        } catch (error) {
            console.error('❌ Error approving booking:', error);
            return {
                success: false,
                message: 'Failed to approve booking',
                error: error.message
            };
        }
    }

    /**
     * Reject a booking
     * @param {string} bookingId - Booking ID
     * @param {string} adminId - Admin user ID
     * @param {string} reason - Rejection reason
     * @returns {Object} Result
     */
    async rejectBooking(bookingId, adminId, reason) {
        const transaction = await sequelize.transaction();

        try {
            const booking = await Booking.findByPk(bookingId, { transaction });

            if (!booking) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Booking not found',
                    statusCode: 404
                };
            }

            if (booking.status === 'rejected' || booking.status === 'cancelled') {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Booking is already rejected or cancelled',
                    statusCode: 400
                };
            }

            // Update booking status
            await booking.update({
                status: 'rejected',
                cancellationReason: reason,
                cancelledBy: adminId,
                cancelledAt: new Date()
            }, { transaction });

            // Deactivate PropertyAvailability records for this booking
            // This frees up the dates for other bookings
            await PropertyAvailability.update(
                { isActive: false },
                {
                    where: {
                        bookingId: booking.id,
                        isActive: true
                    },
                    transaction
                }
            );

            console.log(`✅ Deactivated availability records for rejected booking ${bookingId}`);

            // Process refund if payment was made
            if (booking.paymentStatus === 'completed') {
                const walletService = (await import('./walletService.js')).default;
                await walletService.processRefund(
                    booking.userId,
                    booking.totalPrice,
                    `Refund for rejected booking #${bookingId.substring(0, 8)}`,
                    bookingId
                );

                await booking.update({ paymentStatus: 'refunded' }, { transaction }); // Added transaction option
            }

            await transaction.commit();

            return {
                success: true,
                message: 'Booking rejected successfully',
                data: booking
            };
        } catch (error) {
            console.error('❌ Error rejecting booking:', error);
            return {
                success: false,
                message: 'Failed to reject booking',
                error: error.message
            };
        }
    }

    /**
     * Get booking statistics
     * @param {Object} dateRange - Date range for statistics
     * @returns {Object} Statistics data
     */
    async getStatistics(dateRange = {}) {
        try {
            const { startDate, endDate } = dateRange;
            const where = {};

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) where.createdAt[Op.lte] = new Date(endDate);
            }

            // Total bookings
            const totalBookings = await Booking.count({ where });

            // Bookings by status
            const bookingsByStatus = await Booking.findAll({
                where,
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            // Bookings by payment status
            const bookingsByPaymentStatus = await Booking.findAll({
                where,
                attributes: [
                    'paymentStatus',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['paymentStatus']
            });

            // Revenue statistics
            const revenueStats = await Booking.findOne({
                where: {
                    ...where,
                    paymentStatus: 'completed'
                },
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue'],
                    [sequelize.fn('SUM', sequelize.col('serviceFee')), 'totalServiceFees'],
                    [sequelize.fn('SUM', sequelize.col('taxAmount')), 'totalTax'],
                    [sequelize.fn('AVG', sequelize.col('totalPrice')), 'averageBookingValue']
                ]
            });

            // Top properties by bookings
            const topProperties = await Booking.findAll({
                where,
                attributes: [
                    'propertyId',
                    [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookingCount'],
                    [sequelize.fn('SUM', sequelize.col('totalPrice')), 'totalRevenue']
                ],
                include: [
                    {
                        model: Property,
                        as: 'property',
                        attributes: ['id', 'title', 'propertyType']
                    }
                ],
                group: ['propertyId', 'property.id'],
                order: [[sequelize.fn('COUNT', sequelize.col('Booking.id')), 'DESC']],
                limit: 10
            });

            return {
                success: true,
                data: {
                    totalBookings,
                    bookingsByStatus: bookingsByStatus.reduce((acc, item) => {
                        acc[item.status] = parseInt(item.dataValues.count);
                        return acc;
                    }, {}),
                    bookingsByPaymentStatus: bookingsByPaymentStatus.reduce((acc, item) => {
                        acc[item.paymentStatus] = parseInt(item.dataValues.count);
                        return acc;
                    }, {}),
                    revenue: {
                        total: parseFloat(revenueStats?.dataValues?.totalRevenue || 0),
                        serviceFees: parseFloat(revenueStats?.dataValues?.totalServiceFees || 0),
                        tax: parseFloat(revenueStats?.dataValues?.totalTax || 0),
                        average: parseFloat(revenueStats?.dataValues?.averageBookingValue || 0)
                    },
                    topProperties: topProperties.map(item => ({
                        property: item.property,
                        bookingCount: parseInt(item.dataValues.bookingCount),
                        totalRevenue: parseFloat(item.dataValues.totalRevenue || 0)
                    }))
                }
            };
        } catch (error) {
            console.error('❌ Error fetching booking statistics:', error);
            return {
                success: false,
                message: 'Failed to fetch statistics',
                error: error.message
            };
        }
    }

    /**
     * Mark booking as paid (manual payment confirmation)
     * @param {string} bookingId - Booking ID
     * @param {Object} paymentData - Payment information
     * @returns {Object} Result
     */
    async markAsPaid(bookingId, paymentData) {
        try {
            const { paymentMethod, transactionId, adminId } = paymentData;

            const booking = await Booking.findByPk(bookingId);

            if (!booking) {
                return {
                    success: false,
                    statusCode: 404,
                    message: 'Booking not found'
                };
            }

            if (booking.paymentStatus === 'completed') {
                return {
                    success: false,
                    statusCode: 400,
                    message: 'Booking payment is already completed'
                };
            }

            // Update booking payment status
            await booking.update({
                paymentStatus: 'completed',
                paymentMethod,
                transactionId: transactionId || `MANUAL-${Date.now()}-${bookingId.substring(0, 8)}`,
                adminNotes: booking.adminNotes
                    ? `${booking.adminNotes}\n[${new Date().toISOString()}] Payment manually confirmed by admin (${adminId})`
                    : `[${new Date().toISOString()}] Payment manually confirmed by admin (${adminId})`
            });

            return {
                success: true,
                message: 'Payment marked as completed successfully',
                data: booking
            };
        } catch (error) {
            console.error('❌ Error marking payment as paid:', error);
            return {
                success: false,
                message: 'Failed to mark payment as completed',
                error: error.message
            };
        }
    }
}

export default new AdminBookingService();
