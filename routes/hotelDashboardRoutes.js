import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  getDashboardSummary,
  getRoomInventory,
  updateRoomPricing,
  getHotelBookings,
  respondHotelBooking,
  getAvailabilityCalendar,
  getHotelAnalytics
} from '../controllers/hotelDashboardController.js';
import {
  summaryValidation,
  inventoryValidation,
  updatePricingValidation,
  bookingsValidation,
  respondBookingValidation,
  availabilityValidation
} from '../validations/hotelDashboardValidation.js';
import { validationResult } from 'express-validator';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return next();
};

router.use(authenticateToken, requireRole('hotel_provider'));

router.get('/summary', summaryValidation, handleValidationErrors, getDashboardSummary);
router.get('/rooms', inventoryValidation, handleValidationErrors, getRoomInventory);
router.put('/rooms/:propertyId/pricing', updatePricingValidation, handleValidationErrors, updateRoomPricing);
router.get('/bookings', bookingsValidation, handleValidationErrors, getHotelBookings);
router.put('/bookings/:bookingId/respond', respondBookingValidation, handleValidationErrors, respondHotelBooking);
router.get('/rooms/:propertyId/availability', availabilityValidation, handleValidationErrors, getAvailabilityCalendar);
router.get('/analytics', summaryValidation, handleValidationErrors, getHotelAnalytics);

export default router;




