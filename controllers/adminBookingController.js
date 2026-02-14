import adminBookingService from '../services/adminBookingService.js';

/**
 * Admin Booking Controller
 * Handles HTTP requests for admin booking management
 */

/**
 * Get all bookings with filtering and pagination
 */
export const getAllBookings = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            paymentStatus: req.query.paymentStatus,
            walletStatus: req.query.walletStatus,
            bookingType: req.query.bookingType,
            propertyId: req.query.propertyId,
            userId: req.query.userId,
            ownerId: req.query.ownerId,
            search: req.query.search,
            checkInFrom: req.query.checkInFrom,
            checkInTo: req.query.checkInTo,
            checkOutFrom: req.query.checkOutFrom,
            checkOutTo: req.query.checkOutTo,
            createdFrom: req.query.createdFrom,
            createdTo: req.query.createdTo
        };

        const pagination = {
            page: req.query.page || 1,
            limit: req.query.limit || 20
        };

        const sort = {
            sortBy: req.query.sortBy || 'createdAt',
            sortOrder: req.query.sortOrder || 'DESC'
        };

        const result = await adminBookingService.getAllBookings(filters, pagination, sort);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in getAllBookings controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

/**
 * Get detailed booking information
 */
export const getBookingDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await adminBookingService.getBookingDetails(id);

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in getBookingDetails controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch booking details',
            error: error.message
        });
    }
};

/**
 * Update booking
 */
export const updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const adminId = req.user.id;

        const result = await adminBookingService.updateBooking(id, updates, adminId);

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in updateBooking controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
};

/**
 * Approve booking
 */
export const approveBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const result = await adminBookingService.approveBooking(id, adminId);

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in approveBooking controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to approve booking',
            error: error.message
        });
    }
};

/**
 * Reject booking
 */
export const rejectBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const result = await adminBookingService.rejectBooking(id, adminId, reason);

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in rejectBooking controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reject booking',
            error: error.message
        });
    }
};

/**
 * Mark booking as paid (manual payment confirmation)
 */
export const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, transactionId } = req.body;
        const adminId = req.user.id;

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        const result = await adminBookingService.markAsPaid(id, {
            paymentMethod,
            transactionId,
            adminId
        });

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in markAsPaid controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to mark payment as completed',
            error: error.message
        });
    }
};

/**
 * Get booking statistics
 */
export const getStatistics = async (req, res) => {
    try {
        const dateRange = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const result = await adminBookingService.getStatistics(dateRange);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in getStatistics controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

/**
 * Confirm a booking (admin action)
 */
export const confirmBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { ownerNotes } = req.body;
        const adminId = req.user.id;

        const result = await adminBookingService.confirmBooking(id, {
            ownerNotes,
            adminId
        });

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in confirmBooking controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to confirm booking',
            error: error.message
        });
    }
};

/**
 * Cancel a booking (admin action)
 */
export const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellationReason } = req.body;
        const adminId = req.user.id;

        if (!cancellationReason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const result = await adminBookingService.cancelBooking(id, {
            cancellationReason,
            adminId
        });

        if (!result.success) {
            return res.status(result.statusCode || 500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('❌ Error in cancelBooking controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

export default {
    getAllBookings,
    getBookingDetails,
    updateBooking,
    approveBooking,
    rejectBooking,
    markAsPaid,
    getStatistics,
    confirmBooking,
    cancelBooking
};
