import { body, param } from 'express-validator';

export const initializePaymentValidation = [
  param('bookingId')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Callback URL must be valid'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array of strings'),
  body('channels.*')
    .optional()
    .isString()
    .withMessage('Each channel must be a string'),
  body('reference')
    .optional()
    .isString()
];

// Validation for payment-first flow (no bookingId required)
export const initializePaymentWithDataValidation = [
  body('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  body('amount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('totalPrice')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('Total price must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('callbackUrl')
    .notEmpty()
    .withMessage('Callback URL is required')
    .custom((value) => {
      try {
        const url = new URL(value);
        // Allow http/https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Protocol must be http or https');
        }
        return true;
      } catch (error) {
        throw new Error('Callback URL must be a valid URL');
      }
    })
    .withMessage('Callback URL must be valid'),
  body('bookingType')
    .optional()
    .isIn(['shortlet', 'hotel', 'rent', 'sale'])
    .withMessage('Booking type must be valid'),
  body('checkInDate')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),
  body('checkOutDate')
    .optional()
    .isISO8601()
    .withMessage('Check-out date must be a valid date'),
  body('numberOfGuests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of guests must be at least 1'),
  body('numberOfNights')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of nights must be at least 1'),
  body('guestName')
    .optional()
    .isString()
    .withMessage('Guest name must be a string'),
  body('guestEmail')
    .optional()
    .isEmail()
    .withMessage('Guest email must be valid'),
  body('guestPhone')
    .optional()
    .isString()
    .withMessage('Guest phone must be a string'),
  body('specialRequests')
    .optional()
    .isString()
    .withMessage('Special requests must be a string'),
  body('couponCode')
    .optional()
    .isString()
    .withMessage('Coupon code must be a string'),
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array of strings'),
  body('channels.*')
    .optional()
    .isString()
    .withMessage('Each channel must be a string'),
  body('reference')
    .optional()
    .isString()
    .withMessage('Reference must be a string'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be valid')
];

export const verifyPaymentValidation = [
  body('reference')
    .notEmpty()
    .withMessage('Payment reference is required')
    .isString()
    .withMessage('Payment reference must be a string')
];

export const initiatePayoutValidation = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),
  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be 10 digits')
    .isNumeric()
    .withMessage('Account number must contain only digits'),
  body('bankCode')
    .notEmpty()
    .withMessage('Bank code is required'),
  body('accountName')
    .notEmpty()
    .withMessage('Account name is required'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('Reason must be a string with maximum length of 255 characters'),
  body('reference')
    .optional()
    .isString()
    .withMessage('Reference must be a string')
];

export const verifyBankAccountValidation = [
  body('accountNumber')
    .notEmpty()
    .withMessage('Account number is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Account number must be 10 digits')
    .isNumeric()
    .withMessage('Account number must contain only digits'),
  body('bankCode')
    .notEmpty()
    .withMessage('Bank code is required')
];


