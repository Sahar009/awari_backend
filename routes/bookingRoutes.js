import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  bookingIdValidation,
  propertyIdValidation,
  createBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  getBookingsValidation
} from '../validations/bookingValidation.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         propertyId:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         ownerId:
 *           type: string
 *           format: uuid
 *         bookingType:
 *           type: string
 *           enum: [shortlet, rental, hotel, sale_inspection]
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, rejected, expired]
 *         checkInDate:
 *           type: string
 *           format: date
 *         checkOutDate:
 *           type: string
 *           format: date
 *         inspectionDate:
 *           type: string
 *           format: date-time
 *         inspectionTime:
 *           type: string
 *           format: time
 *         numberOfNights:
 *           type: integer
 *           minimum: 1
 *         numberOfGuests:
 *           type: integer
 *           minimum: 1
 *         basePrice:
 *           type: number
 *           format: decimal
 *         totalPrice:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *           example: NGN
 *         serviceFee:
 *           type: number
 *           format: decimal
 *         taxAmount:
 *           type: number
 *           format: decimal
 *         discountAmount:
 *           type: number
 *           format: decimal
 *         paymentStatus:
 *           type: string
 *           enum: [pending, partial, completed, failed, refunded]
 *         paymentMethod:
 *           type: string
 *         transactionId:
 *           type: string
 *         guestName:
 *           type: string
 *         guestPhone:
 *           type: string
 *         guestEmail:
 *           type: string
 *           format: email
 *         specialRequests:
 *           type: string
 *         cancellationReason:
 *           type: string
 *         cancelledBy:
 *           type: string
 *           format: uuid
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *         ownerNotes:
 *           type: string
 *         adminNotes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     CreateBookingRequest:
 *       type: object
 *       required:
 *         - propertyId
 *         - bookingType
 *         - basePrice
 *         - totalPrice
 *       properties:
 *         propertyId:
 *           type: string
 *           format: uuid
 *         bookingType:
 *           type: string
 *           enum: [shortlet, rental, hotel, sale_inspection]
 *         checkInDate:
 *           type: string
 *           format: date
 *         checkOutDate:
 *           type: string
 *           format: date
 *         inspectionDate:
 *           type: string
 *           format: date-time
 *         inspectionTime:
 *           type: string
 *           format: time
 *         numberOfNights:
 *           type: integer
 *           minimum: 1
 *         numberOfGuests:
 *           type: integer
 *           minimum: 1
 *         basePrice:
 *           type: number
 *           format: decimal
 *         totalPrice:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *           default: NGN
 *         serviceFee:
 *           type: number
 *           format: decimal
 *         taxAmount:
 *           type: number
 *           format: decimal
 *         discountAmount:
 *           type: number
 *           format: decimal
 *         guestName:
 *           type: string
 *         guestPhone:
 *           type: string
 *         guestEmail:
 *           type: string
 *           format: email
 *         specialRequests:
 *           type: string
 * 
 *     BookingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Booking'
 * 
 *     BookingsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             bookings:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *             pagination:
 *               $ref: '#/components/schemas/PaginationResponse'
 * 
 *     BookingStatistics:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         pending:
 *           type: integer
 *         confirmed:
 *           type: integer
 *         completed:
 *           type: integer
 *         cancelled:
 *           type: integer
 *         rejected:
 *           type: integer
 *         totalRevenue:
 *           type: number
 *         successRate:
 *           type: integer
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBookingRequest'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Validation error or bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 *       409:
 *         description: Property not available for selected dates
 *       500:
 *         description: Internal server error
 */
router.post('/',
  authenticateToken,
  createBookingValidation,
  handleValidationErrors,
  bookingController.createBooking
);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of bookings per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, rejected, expired]
 *         description: Filter by booking status
 *       - in: query
 *         name: bookingType
 *         schema:
 *           type: string
 *           enum: [shortlet, rental, hotel, sale_inspection]
 *         description: Filter by booking type
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, checkInDate, checkOutDate, totalPrice, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingsResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/',
  authenticateToken,
  getBookingsValidation,
  handleValidationErrors,
  bookingController.getUserBookings
);

/**
 * @swagger
 * /api/bookings/statistics:
 *   get:
 *     summary: Get booking statistics
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [user, owner]
 *           default: user
 *         description: Type of statistics (user bookings or owned property bookings)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/BookingStatistics'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/statistics',
  authenticateToken,
  bookingController.getBookingStatistics
);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/:bookingId',
  authenticateToken,
  bookingIdValidation,
  handleValidationErrors,
  bookingController.getBookingById
);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   put:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed, rejected, expired]
 *               checkInDate:
 *                 type: string
 *                 format: date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *               inspectionDate:
 *                 type: string
 *                 format: date-time
 *               inspectionTime:
 *                 type: string
 *                 format: time
 *               numberOfNights:
 *                 type: integer
 *                 minimum: 1
 *               numberOfGuests:
 *                 type: integer
 *                 minimum: 1
 *               totalPrice:
 *                 type: number
 *                 format: decimal
 *               serviceFee:
 *                 type: number
 *                 format: decimal
 *               taxAmount:
 *                 type: number
 *                 format: decimal
 *               discountAmount:
 *                 type: number
 *                 format: decimal
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, partial, completed, failed, refunded]
 *               paymentMethod:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               guestName:
 *                 type: string
 *               guestPhone:
 *                 type: string
 *               guestEmail:
 *                 type: string
 *                 format: email
 *               specialRequests:
 *                 type: string
 *               cancellationReason:
 *                 type: string
 *               ownerNotes:
 *                 type: string
 *               adminNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Validation error or cannot update completed/cancelled booking
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to update this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.put('/:bookingId',
  authenticateToken,
  bookingIdValidation,
  updateBookingValidation,
  handleValidationErrors,
  bookingController.updateBooking
);

/**
 * @swagger
 * /api/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Booking cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to cancel this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.post('/:bookingId/cancel',
  authenticateToken,
  bookingIdValidation,
  cancelBookingValidation,
  handleValidationErrors,
  bookingController.cancelBooking
);

/**
 * @swagger
 * /api/bookings/{bookingId}/confirm:
 *   post:
 *     summary: Confirm booking (owner only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ownerNotes:
 *                 type: string
 *                 description: Owner notes about the booking
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Only pending bookings can be confirmed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only property owner can confirm bookings
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.post('/:bookingId/confirm',
  authenticateToken,
  bookingIdValidation,
  handleValidationErrors,
  bookingController.confirmBooking
);

/**
 * @swagger
 * /api/bookings/{bookingId}/reject:
 *   post:
 *     summary: Reject booking (owner only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ownerNotes:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Only pending bookings can be rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only property owner can reject bookings
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.post('/:bookingId/reject',
  authenticateToken,
  bookingIdValidation,
  handleValidationErrors,
  bookingController.rejectBooking
);

/**
 * @swagger
 * /api/bookings/{bookingId}/complete:
 *   post:
 *     summary: Complete booking (owner only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ownerNotes:
 *                 type: string
 *                 description: Completion notes
 *     responses:
 *       200:
 *         description: Booking completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         description: Only confirmed bookings can be completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only property owner can complete bookings
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.post('/:bookingId/complete',
  authenticateToken,
  bookingIdValidation,
  handleValidationErrors,
  bookingController.completeBooking
);

/**
 * @swagger
 * /api/properties/{propertyId}/bookings:
 *   get:
 *     summary: Get property bookings (owner only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of bookings per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, rejected, expired]
 *         description: Filter by booking status
 *       - in: query
 *         name: bookingType
 *         schema:
 *           type: string
 *           enum: [shortlet, rental, hotel, sale_inspection]
 *         description: Filter by booking type
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, partial, completed, failed, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings until this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, checkInDate, checkOutDate, totalPrice, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Property bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view property bookings
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get('/properties/:propertyId/bookings',
  authenticateToken,
  propertyIdValidation,
  getBookingsValidation,
  handleValidationErrors,
  bookingController.getPropertyBookings
);

/**
 * @swagger
 * /api/bookings/{id}/download-receipt:
 *   get:
 *     summary: Download booking receipt as PDF
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: PDF receipt downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to access this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/download-receipt',
  authenticateToken,
  param('id').isUUID().withMessage('Invalid booking ID'),
  handleValidationErrors,
  bookingController.downloadBookingReceipt
);

export default router;
