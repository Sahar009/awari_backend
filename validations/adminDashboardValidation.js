import { query, body, param } from 'express-validator';

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const overviewValidation = [
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date')
];

export const usersValidation = [
  ...paginationValidation,
  query('role')
    .optional()
    .isIn(['renter', 'buyer', 'landlord', 'agent', 'hotel_provider', 'admin'])
    .withMessage('Invalid role filter'),
  query('status')
    .optional()
    .isIn(['pending', 'active', 'suspended', 'banned', 'deleted'])
    .withMessage('Invalid status filter'),
  query('search').optional().isString().withMessage('search must be a string'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'lastLogin', 'firstName', 'role', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder must be ASC or DESC')
];

export const createAdminUserValidation = [
  body('firstName')
    .exists().withMessage('firstName is required')
    .isString().withMessage('firstName must be a string')
    .isLength({ min: 2, max: 100 }).withMessage('firstName must be between 2 and 100 characters'),
  body('lastName')
    .exists().withMessage('lastName is required')
    .isString().withMessage('lastName must be a string')
    .isLength({ min: 2, max: 100 }).withMessage('lastName must be between 2 and 100 characters'),
  body('email').exists().withMessage('email is required').isEmail().withMessage('email must be valid'),
  body('phone')
    .optional()
    .isString()
    .isLength({ max: 25 })
    .withMessage('phone must be 25 characters or less')
];

export const updateUserStatusValidation = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('action')
    .exists().withMessage('Action is required')
    .isIn(['activate', 'suspend', 'ban', 'reinstate', 'approve'])
    .withMessage('Invalid action'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('reason must be 500 characters or less')
];

export const userIdParamValidation = [
  param('userId').isUUID().withMessage('userId must be a valid UUID')
];

export const updateUserRoleValidation = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('role')
    .exists().withMessage('Role is required')
    .isIn(['renter', 'buyer', 'landlord', 'agent', 'hotel_provider', 'admin'])
    .withMessage('Invalid role')
];

export const updateUserProfileValidation = [
  param('userId').isUUID().withMessage('userId must be a valid UUID'),
  body('firstName').optional().isString().isLength({ min: 2, max: 100 }).withMessage('firstName must be 2-100 characters'),
  body('lastName').optional().isString().isLength({ min: 2, max: 100 }).withMessage('lastName must be 2-100 characters'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phone').optional().isString().isLength({ max: 25 }).withMessage('phone must be 25 characters or less'),
  body('avatarUrl').optional().isURL().withMessage('avatarUrl must be a valid URL'),
  body('address').optional().isString().isLength({ max: 500 }).withMessage('address must be 500 characters or less'),
  body('city').optional().isString().isLength({ max: 100 }).withMessage('city must be 100 characters or less'),
  body('state').optional().isString().isLength({ max: 100 }).withMessage('state must be 100 characters or less'),
  body('language').optional().isString().isLength({ max: 10 }).withMessage('language must be 10 characters or less'),
  body('bio').optional().isString().isLength({ max: 2000 }).withMessage('bio must be 2000 characters or less'),
  body('socialLinks').optional().custom((value) => {
    if (typeof value === 'object') return true;
    if (typeof value === 'string') {
      JSON.parse(value);
      return true;
    }
    throw new Error('socialLinks must be an object or JSON string');
  }),
  body('preferences').optional().custom((value) => {
    if (typeof value === 'object') return true;
    if (typeof value === 'string') {
      JSON.parse(value);
      return true;
    }
    throw new Error('preferences must be an object or JSON string');
  }),
  body('dateOfBirth').optional().isISO8601().withMessage('dateOfBirth must be a valid date'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('gender must be male, female, or other'),
  body('emailVerified').optional().isBoolean().withMessage('emailVerified must be boolean').toBoolean(),
  body('phoneVerified').optional().isBoolean().withMessage('phoneVerified must be boolean').toBoolean(),
  body('kycVerified').optional().isBoolean().withMessage('kycVerified must be boolean').toBoolean(),
  body('profileCompleted').optional().isBoolean().withMessage('profileCompleted must be boolean').toBoolean()
];

export const propertiesManagementValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'rejected', 'archived'])
    .withMessage('Invalid status filter'),
  query('listingType')
    .optional()
    .isIn(['rent', 'sale', 'shortlet'])
    .withMessage('Invalid listing type'),
  query('propertyType')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('propertyType must be a string'),
  query('city').optional().isString().withMessage('city must be a string'),
  query('state').optional().isString().withMessage('state must be a string'),
  query('featured')
    .optional()
    .isBoolean()
    .withMessage('featured must be true or false')
    .toBoolean(),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search must be a string'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'price', 'viewCount', 'title', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder must be ASC or DESC')
];

export const propertiesValidation = [
  ...paginationValidation
];

export const moderatePropertyValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID'),
  body('status')
    .exists().withMessage('Status is required')
    .isIn(['active', 'rejected'])
    .withMessage('Status must be active or rejected'),
  body('rejectionReason').optional().isString().isLength({ max: 500 }).withMessage('rejectionReason must be 500 characters or less'),
  body('moderationNotes').optional().isString().isLength({ max: 500 }).withMessage('moderationNotes must be 500 characters or less')
];

export const subscriptionsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'cancelled', 'expired', 'pending'])
    .withMessage('Invalid subscription status'),
  query('planType')
    .optional()
    .isIn(['basic', 'premium', 'enterprise', 'custom', 'other'])
    .withMessage('Invalid plan type'),
  query('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle'),
  query('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('autoRenew must be true or false')
    .toBoolean(),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search must be a string')
];

export const propertyIdParamValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID')
];

export const updatePropertyStatusValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID'),
  body('status')
    .exists().withMessage('Status is required')
    .isIn(['pending', 'active', 'inactive', 'rejected', 'archived', 'sold', 'rented'])
    .withMessage('Invalid status'),
  body('rejectionReason').optional().isString().isLength({ max: 1000 }).withMessage('rejectionReason must be 1000 characters or less'),
  body('moderationNotes').optional().isString().isLength({ max: 1000 }).withMessage('moderationNotes must be 1000 characters or less')
];

export const updatePropertyFeatureValidation = [
  param('propertyId').isUUID().withMessage('propertyId must be a valid UUID'),
  body('featured')
    .exists().withMessage('featured is required')
    .isBoolean()
    .withMessage('featured must be true or false')
    .toBoolean(),
  body('featuredUntil')
    .optional()
    .isISO8601()
    .withMessage('featuredUntil must be a valid ISO date string')
];

export const moderationReviewsValidation = [
  ...paginationValidation,
  query('filter')
    .optional()
    .isIn(['pending', 'flagged', 'all'])
    .withMessage('filter must be pending, flagged, or all'),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search must be a string')
];

export const moderationListingsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'rejected', 'archived', 'flagged'])
    .withMessage('status must be pending, rejected, archived, or flagged'),
  query('listingType')
    .optional()
    .isIn(['rent', 'sale', 'shortlet'])
    .withMessage('Invalid listing type'),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search must be a string')
];

export const moderationKycValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'expired'])
    .withMessage('Invalid KYC status'),
  query('documentType')
    .optional()
    .isIn(['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'])
    .withMessage('Invalid document type')
];

export const moderationPaymentsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['failed', 'refunded', 'pending'])
    .withMessage('Invalid payment status filter')
];

export const updateKycDocumentValidation = [
  param('documentId').isUUID().withMessage('documentId must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'expired'])
    .withMessage('Invalid KYC status'),
  body('verificationNotes')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('verificationNotes must be 1000 characters or less'),
  body('rejectionReason')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('rejectionReason must be 1000 characters or less')
];

export const transactionsValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid transaction status'),
  query('paymentType')
    .optional()
    .isIn(['booking', 'subscription', 'service_fee', 'refund', 'payout'])
    .withMessage('Invalid payment type'),
  query('paymentMethod')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('paymentMethod must be 50 characters or less'),
  query('gateway')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('gateway must be 50 characters or less'),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date'),
  query('search').optional().isString().isLength({ max: 200 }).withMessage('search must be a string')
];

export const subscriptionIdParamValidation = [
  param('subscriptionId').isUUID().withMessage('subscriptionId must be a valid UUID')
];

export const createSubscriptionValidation = [
  body('userId').exists().withMessage('userId is required').isUUID().withMessage('userId must be a valid UUID'),
  body('planType')
    .optional()
    .isIn(['basic', 'premium', 'enterprise', 'custom', 'other'])
    .withMessage('Invalid plan type'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle'),
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('autoRenew must be true or false')
    .toBoolean(),
  body('customPlan').optional().isObject().withMessage('customPlan must be an object'),
  body('customPlan.planName').optional().isString().withMessage('customPlan.planName must be a string'),
  body('customPlan.monthlyPrice').optional().isFloat({ min: 0 }).withMessage('customPlan.monthlyPrice must be a positive number'),
  body('customPlan.yearlyPrice').optional().isFloat({ min: 0 }).withMessage('customPlan.yearlyPrice must be a positive number'),
  body('customPlan.maxProperties').optional().isInt({ min: 1 }).withMessage('customPlan.maxProperties must be at least 1')
];

export const updateSubscriptionValidation = [
  param('subscriptionId').isUUID().withMessage('subscriptionId must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'cancelled', 'expired', 'pending'])
    .withMessage('Invalid subscription status'),
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('autoRenew must be true or false')
    .toBoolean(),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle'),
  body('nextBillingDate')
    .optional()
    .isISO8601()
    .withMessage('nextBillingDate must be a valid ISO date')
];

export const cancelSubscriptionValidation = [
  param('subscriptionId').isUUID().withMessage('subscriptionId must be a valid UUID'),
  body('cancellationReason')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('cancellationReason must be 1000 characters or less')
];

export const renewSubscriptionValidation = [
  param('subscriptionId').isUUID().withMessage('subscriptionId must be a valid UUID'),
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle')
];

export const subscriptionPlansValidation = [
  ...paginationValidation,
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('status must be active or inactive'),
  query('planType')
    .optional()
    .isIn(['basic', 'premium', 'enterprise', 'custom', 'other'])
    .withMessage('Invalid plan type filter'),
  query('search')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('search must be a string'),
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be true or false')
    .toBoolean()
];

export const subscriptionPlanIdParamValidation = [
  param('planId').isUUID().withMessage('planId must be a valid UUID')
];

export const createSubscriptionPlanValidation = [
  body('name').exists().withMessage('name is required').isString().isLength({ min: 3, max: 120 }).withMessage('name must be between 3 and 120 characters'),
  body('slug').optional().isString().isLength({ min: 2, max: 150 }).withMessage('slug must be between 2 and 150 characters'),
  body('planType').optional().isIn(['basic', 'premium', 'enterprise', 'custom', 'other']).withMessage('Invalid plan type'),
  body('description').optional().isString().isLength({ max: 2000 }).withMessage('description must be 2000 characters or less'),
  body('monthlyPrice').exists().withMessage('monthlyPrice is required').isFloat({ min: 0 }).withMessage('monthlyPrice must be a positive number'),
  body('yearlyPrice').optional().isFloat({ min: 0 }).withMessage('yearlyPrice must be a positive number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code'),
  body('maxProperties').optional().isInt({ min: -1 }).withMessage('maxProperties must be -1 (for unlimited) or a positive integer'),
  body('maxPhotosPerProperty').optional().isInt({ min: 1 }).withMessage('maxPhotosPerProperty must be a positive integer'),
  body('featuredProperties').optional().isInt({ min: -1 }).withMessage('featuredProperties must be -1 (for unlimited) or a positive integer'),
  body('prioritySupport').optional().isBoolean().withMessage('prioritySupport must be true or false').toBoolean(),
  body('analyticsAccess').optional().isBoolean().withMessage('analyticsAccess must be true or false').toBoolean(),
  body('supportLevel').optional().isString().isLength({ max: 50 }).withMessage('supportLevel must be 50 characters or less'),
  body('trialPeriodDays').optional().isInt({ min: 0, max: 365 }).withMessage('trialPeriodDays must be between 0 and 365'),
  body('isRecommended').optional().isBoolean().withMessage('isRecommended must be true or false').toBoolean(),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
  body('features')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every((item) => typeof item === 'string');
      }
      if (typeof value === 'string') {
        return true;
      }
      throw new Error('features must be an array of strings or a newline-delimited string');
    }),
  body('metadata').optional().isObject().withMessage('metadata must be an object')
];

export const updateSubscriptionPlanValidation = [
  subscriptionPlanIdParamValidation[0],
  body('name').optional().isString().isLength({ min: 3, max: 120 }).withMessage('name must be between 3 and 120 characters'),
  body('slug').optional().isString().isLength({ min: 2, max: 150 }).withMessage('slug must be between 2 and 150 characters'),
  body('planType').optional().isIn(['basic', 'premium', 'enterprise', 'custom', 'other']).withMessage('Invalid plan type'),
  body('description').optional().isString().isLength({ max: 2000 }).withMessage('description must be 2000 characters or less'),
  body('monthlyPrice').optional().isFloat({ min: 0 }).withMessage('monthlyPrice must be a positive number'),
  body('yearlyPrice').optional().isFloat({ min: 0 }).withMessage('yearlyPrice must be a positive number'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter ISO code'),
  body('maxProperties').optional().isInt({ min: -1 }).withMessage('maxProperties must be -1 (for unlimited) or a positive integer'),
  body('maxPhotosPerProperty').optional().isInt({ min: 1 }).withMessage('maxPhotosPerProperty must be a positive integer'),
  body('featuredProperties').optional().isInt({ min: -1 }).withMessage('featuredProperties must be -1 (for unlimited) or a positive integer'),
  body('prioritySupport').optional().isBoolean().withMessage('prioritySupport must be true or false').toBoolean(),
  body('analyticsAccess').optional().isBoolean().withMessage('analyticsAccess must be true or false').toBoolean(),
  body('supportLevel').optional().isString().isLength({ max: 50 }).withMessage('supportLevel must be 50 characters or less'),
  body('trialPeriodDays').optional().isInt({ min: 0, max: 365 }).withMessage('trialPeriodDays must be between 0 and 365'),
  body('isRecommended').optional().isBoolean().withMessage('isRecommended must be true or false').toBoolean(),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
  body('features')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every((item) => typeof item === 'string');
      }
      if (typeof value === 'string') {
        return true;
      }
      throw new Error('features must be an array of strings or a newline-delimited string');
    }),
  body('metadata').optional().isObject().withMessage('metadata must be an object')
];

export const toggleSubscriptionPlanStatusValidation = [
  subscriptionPlanIdParamValidation[0],
  body('isActive').exists().withMessage('isActive is required').isBoolean().withMessage('isActive must be true or false').toBoolean()
];

export const reportsMetricsValidation = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('months must be an integer between 1 and 12'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO date')
];


