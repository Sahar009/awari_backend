import { body, param, query } from 'express-validator';

// Common validations
export const bookingIdValidation = [
  param('bookingId')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID')
];

export const propertyIdValidation = [
  param('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID')
];

// Create booking validation
export const createBookingValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  
  body('bookingType')
    .isIn(['shortlet', 'rental', 'sale_inspection'])
    .withMessage('Booking type must be one of: shortlet, rental, sale_inspection'),
  
  body('checkInDate')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) < new Date()) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  
  body('checkOutDate')
    .optional()
    .isISO8601()
    .withMessage('Check-out date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.checkInDate && new Date(value) <= new Date(req.body.checkInDate)) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),
  
  body('inspectionDate')
    .optional()
    .isISO8601()
    .withMessage('Inspection date must be a valid date')
    .custom((value) => {
      if (value && new Date(value) < new Date()) {
        throw new Error('Inspection date cannot be in the past');
      }
      return true;
    }),
  
  body('inspectionTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Inspection time must be in HH:MM format'),
  
  body('numberOfNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Number of nights must be between 1 and 365'),
  
  body('numberOfGuests')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of guests must be between 1 and 20'),
  
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  
  body('totalPrice')
    .isFloat({ min: 0 })
    .withMessage('Total price must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),
  
  body('serviceFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Service fee must be a positive number'),
  
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  
  body('guestName')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Guest name must be a string with maximum 200 characters'),
  
  body('guestPhone')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Guest phone must be a string with maximum 20 characters'),
  
  body('guestEmail')
    .optional()
    .isEmail()
    .withMessage('Guest email must be a valid email address'),
  
  body('specialRequests')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Special requests must be a string with maximum 1000 characters')
];

// Update booking validation
export const updateBookingValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'])
    .withMessage('Status must be one of: pending, confirmed, cancelled, completed, rejected, expired'),
  
  body('checkInDate')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),
  
  body('checkOutDate')
    .optional()
    .isISO8601()
    .withMessage('Check-out date must be a valid date'),
  
  body('inspectionDate')
    .optional()
    .isISO8601()
    .withMessage('Inspection date must be a valid date'),
  
  body('inspectionTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Inspection time must be in HH:MM format'),
  
  body('numberOfNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Number of nights must be between 1 and 365'),
  
  body('numberOfGuests')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of guests must be between 1 and 20'),
  
  body('totalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total price must be a positive number'),
  
  body('serviceFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Service fee must be a positive number'),
  
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'completed', 'failed', 'refunded'])
    .withMessage('Payment status must be one of: pending, partial, completed, failed, refunded'),
  
  body('paymentMethod')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Payment method must be a string with maximum 50 characters'),
  
  body('transactionId')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Transaction ID must be a string with maximum 100 characters'),
  
  body('guestName')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Guest name must be a string with maximum 200 characters'),
  
  body('guestPhone')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Guest phone must be a string with maximum 20 characters'),
  
  body('guestEmail')
    .optional()
    .isEmail()
    .withMessage('Guest email must be a valid email address'),
  
  body('specialRequests')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Special requests must be a string with maximum 1000 characters'),
  
  body('cancellationReason')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason must be a string with maximum 1000 characters'),
  
  body('ownerNotes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Owner notes must be a string with maximum 1000 characters'),
  
  body('adminNotes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must be a string with maximum 1000 characters')
];

// Cancel booking validation
export const cancelBookingValidation = [
  body('cancellationReason')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason must be a string with maximum 1000 characters')
];

// Query validation for listing bookings
export const getBookingsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'])
    .withMessage('Invalid status'),
  
  query('bookingType')
    .optional()
    .isIn(['shortlet', 'rental', 'sale_inspection'])
    .withMessage('Invalid booking type'),
  
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'completed', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'checkInDate', 'checkOutDate', 'totalPrice', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];
