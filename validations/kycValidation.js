import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating KYC documents (with file upload)
 */
export const createKycDocumentValidation = [
  body('documentType')
    .isIn(['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'])
    .withMessage('Invalid document type'),

  body('documentNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Document number must be between 1 and 100 characters'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expiration date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    })
];

/**
 * Validation rules for creating KYC documents (with URL - for API compatibility)
 */
export const createKycDocumentUrlValidation = [
  body('documentType')
    .isIn(['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'])
    .withMessage('Invalid document type'),

  body('documentNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Document number must be between 1 and 100 characters'),

  body('documentUrl')
    .isURL()
    .withMessage('Please provide a valid document URL'),

  body('documentThumbnail')
    .optional()
    .isURL()
    .withMessage('Please provide a valid thumbnail URL'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expiration date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    })
];

/**
 * Validation rules for updating KYC documents
 */
export const updateKycDocumentValidation = [
  body('documentType')
    .optional()
    .isIn(['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'])
    .withMessage('Invalid document type'),

  body('documentNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Document number must be between 1 and 100 characters'),

  body('documentUrl')
    .optional()
    .isURL()
    .withMessage('Please provide a valid document URL'),

  body('documentThumbnail')
    .optional()
    .isURL()
    .withMessage('Please provide a valid thumbnail URL'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid expiration date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    })
];

/**
 * Validation rules for verifying KYC documents (Admin only)
 */
export const verifyKycDocumentValidation = [
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either "approved" or "rejected"'),

  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Verification notes must be between 10 and 1000 characters'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters')
    .custom((value, { req }) => {
      if (req.body.status === 'rejected' && !value) {
        throw new Error('Rejection reason is required when status is rejected');
      }
      return true;
    })
];

/**
 * Validation rules for document ID parameter
 */
export const documentIdValidation = [
  param('documentId')
    .isUUID()
    .withMessage('Invalid document ID format')
];

/**
 * Validation rules for pagination
 */
export const kycPaginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'verifiedAt', 'expiresAt', 'status', 'documentType'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"')
];

/**
 * Validation rules for KYC document filtering
 */
export const kycFilterValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'expired'])
    .withMessage('Invalid status filter'),

  query('documentType')
    .optional()
    .isIn(['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'])
    .withMessage('Invalid document type filter'),

  query('userId')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID format'),

  query('verifiedBy')
    .optional()
    .isUUID()
    .withMessage('Invalid verifier ID format')
];

/**
 * Combined validation for user KYC documents endpoint
 */
export const getUserKycDocumentsValidation = [
  ...kycPaginationValidation,
  ...kycFilterValidation
];

/**
 * Combined validation for admin KYC documents endpoint
 */
export const getAdminKycDocumentsValidation = [
  ...kycPaginationValidation,
  ...kycFilterValidation
];
