import { query, body, param } from 'express-validator';

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const summaryValidation = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date')
];

export const inventoryValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'active', 'inactive', 'archived'])
    .withMessage('Invalid status filter'),
  query('city').optional().isString().withMessage('city must be a string'),
  query('search').optional().isString().withMessage('search must be a string')
];

export const updatePricingValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID'),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be a positive number'),
  body('originalPrice').optional().isFloat({ min: 0 }).withMessage('originalPrice must be a positive number'),
  body('pricePeriod')
    .optional()
    .isIn(['per_night', 'per_month', 'per_year', 'one_time'])
    .withMessage('Invalid price period'),
  body('negotiable').optional().isBoolean().withMessage('negotiable must be a boolean')
];

export const bookingsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'checked_in', 'rejected'])
    .withMessage('Invalid booking status'),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'checkInDate', 'checkOutDate', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder must be ASC or DESC')
];

export const respondBookingValidation = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
  body('action')
    .exists().withMessage('Action is required')
    .isIn(['approve', 'reject', 'check_in', 'check_out'])
    .withMessage('Action must be approve, reject, check_in or check_out'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('notes must be 500 characters or less')
];

export const availabilityValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
  query('year').optional().isInt({ min: 1970 }).withMessage('year must be a valid year')
];



