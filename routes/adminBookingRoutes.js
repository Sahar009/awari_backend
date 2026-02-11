import express from 'express';
import * as adminBookingController from '../controllers/adminBookingController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Admin Booking Routes
 * All routes require admin authentication
 */

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings with filtering and pagination
 * @access  Admin
 * @query   {string} status - Filter by booking status
 * @query   {string} paymentStatus - Filter by payment status
 * @query   {string} walletStatus - Filter by wallet status
 * @query   {string} bookingType - Filter by booking type
 * @query   {string} propertyId - Filter by property ID
 * @query   {string} userId - Filter by user ID
 * @query   {string} ownerId - Filter by owner ID
 * @query   {string} search - Search by booking ID, guest name, email, property title
 * @query   {string} checkInFrom - Filter by check-in date (from)
 * @query   {string} checkInTo - Filter by check-in date (to)
 * @query   {string} checkOutFrom - Filter by check-out date (from)
 * @query   {string} checkOutTo - Filter by check-out date (to)
 * @query   {string} createdFrom - Filter by creation date (from)
 * @query   {string} createdTo - Filter by creation date (to)
 * @query   {number} page - Page number (default: 1)
 * @query   {number} limit - Items per page (default: 20)
 * @query   {string} sortBy - Sort field (default: createdAt)
 * @query   {string} sortOrder - Sort order (ASC/DESC, default: DESC)
 */
router.get(
    '/',
    adminBookingController.getAllBookings
);

/**
 * @route   GET /api/admin/bookings/statistics
 * @desc    Get booking statistics
 * @access  Admin
 * @query   {string} startDate - Start date for statistics
 * @query   {string} endDate - End date for statistics
 */
router.get(
    '/statistics',
    adminBookingController.getStatistics
);

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    Get detailed booking information
 * @access  Admin
 * @param   {string} id - Booking ID
 */
router.get(
    '/:id',
    adminBookingController.getBookingDetails
);

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Update booking
 * @access  Admin
 * @param   {string} id - Booking ID
 * @body    {Object} updates - Fields to update
 */
router.put(
    '/:id',
    adminBookingController.updateBooking
);

/**
 * @route   POST /api/admin/bookings/:id/approve
 * @desc    Approve a pending booking
 * @access  Admin
 * @param   {string} id - Booking ID
 */
router.post(
    '/:id/approve',
    adminBookingController.approveBooking
);

/**
 * @route   POST /api/admin/bookings/:id/mark-paid
 * @desc    Mark booking payment as completed (manual confirmation)
 * @access  Admin
 * @param   {string} id - Booking ID
 * @body    {string} paymentMethod - Payment method used
 * @body    {string} transactionId - Optional transaction ID
 */
router.post(
    '/:id/mark-paid',
    adminBookingController.markAsPaid
);

/**
 * @route   POST /api/admin/bookings/:id/reject
 * @desc    Reject a booking
 * @access  Admin
 * @param   {string} id - Booking ID
 * @body    {string} reason - Rejection reason
 */
router.post(
    '/:id/reject',
    adminBookingController.rejectBooking
);

export default router;
