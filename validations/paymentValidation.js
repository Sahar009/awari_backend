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


