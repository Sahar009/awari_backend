import { query, body, param } from 'express-validator';

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const earningsSummaryValidation = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date string'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date string')
];

export const paymentLogsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),
  query('payoutStatus')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Invalid payoutStatus'),
  query('paymentType')
    .optional()
    .isIn(['booking', 'subscription', 'service_fee', 'refund', 'payout'])
    .withMessage('Invalid paymentType'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'amount', 'status', 'paymentType', 'payoutStatus'])
    .withMessage('Invalid sortBy value'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder must be ASC or DESC')
];

export const inspectionScheduleValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'])
    .withMessage('Invalid status value'),
  query('bookingType')
    .optional()
    .isIn(['shortlet', 'rental', 'sale_inspection'])
    .withMessage('Invalid bookingType'),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date string'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date string')
];

export const bookingRequestsValidation = [
  ...paginationValidation,
  query('bookingType')
    .optional()
    .isIn(['shortlet', 'rental', 'sale_inspection'])
    .withMessage('Invalid bookingType'),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be a valid ISO date string'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be a valid ISO date string')
];

export const respondBookingRequestValidation = [
  param('bookingId').isUUID().withMessage('bookingId must be a valid UUID'),
  body('action')
    .exists().withMessage('Action is required')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either "approve" or "reject"'),
  body('ownerNotes').optional().isString().isLength({ max: 500 }).withMessage('ownerNotes must be 500 characters or less')
];

export const clientInquiriesValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['sent', 'delivered', 'read', 'archived'])
    .withMessage('Invalid status'),
  query('onlyUnread').optional().isBoolean().withMessage('onlyUnread must be a boolean')
];

export const archiveInquiryValidation = [
  param('messageId').isUUID().withMessage('messageId must be a valid UUID')
];


