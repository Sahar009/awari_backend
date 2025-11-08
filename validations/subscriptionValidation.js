import { body, param, query } from 'express-validator';

const SUPPORTED_PLAN_TYPES = ['basic', 'premium', 'enterprise', 'custom', 'other'];
const SUPPORTED_BILLING_CYCLES = ['monthly', 'yearly', 'custom'];

/**
 * Validation rules for creating a subscription
 */
export const createSubscriptionValidation = [
  body('planId')
    .optional()
    .isUUID()
    .withMessage('planId must be a valid UUID'),

  body('planSlug')
    .optional()
    .isString()
    .isLength({ min: 2, max: 150 })
    .withMessage('planSlug must be a valid string'),

  body('planType')
    .optional()
    .isIn(SUPPORTED_PLAN_TYPES)
    .withMessage(`planType must be one of: ${SUPPORTED_PLAN_TYPES.join(', ')}`),

  body('billingCycle')
    .notEmpty()
    .withMessage('billingCycle is required')
    .isIn(SUPPORTED_BILLING_CYCLES)
    .withMessage(`billingCycle must be one of: ${SUPPORTED_BILLING_CYCLES.join(', ')}`),

  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('autoRenew must be a boolean'),

  body('customPlan')
    .optional()
    .isObject()
    .withMessage('customPlan must be an object'),

  body('customPlan.planName')
    .if((value, { req }) => req.body.planType === 'custom')
    .notEmpty()
    .withMessage('customPlan.planName is required when planType is custom'),

  body('customPlan.monthlyPrice')
    .if((value, { req }) => req.body.planType === 'custom')
    .isFloat({ min: 0 })
    .withMessage('customPlan.monthlyPrice must be a positive number'),

  body('customPlan.maxProperties')
    .if((value, { req }) => req.body.planType === 'custom')
    .isInt({ min: 1 })
    .withMessage('customPlan.maxProperties must be a positive integer'),

  body().custom((value, { req }) => {
    if (!req.body.planId && !req.body.planSlug && !req.body.planType) {
      throw new Error('Select a subscription plan before proceeding');
    }
    return true;
  })
];

/**
 * Validation rules for updating a subscription
 */
export const updateSubscriptionValidation = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'cancelled', 'expired', 'pending'])
    .withMessage('Invalid status'),
  
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renew must be a boolean'),
  
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle')
];

/**
 * Validation rules for canceling a subscription
 */
export const cancelSubscriptionValidation = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  body('cancellationReason')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Cancellation reason cannot exceed 1000 characters')
];

/**
 * Validation rules for renewing a subscription
 */
export const renewSubscriptionValidation = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Invalid billing cycle')
];

/**
 * Validation rules for subscription ID parameter
 */
export const subscriptionIdValidation = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID')
];

/**
 * Validation rules for getting subscriptions
 */
export const getSubscriptionsValidation = [
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
    .isIn(['active', 'inactive', 'cancelled', 'expired', 'pending'])
    .withMessage('Invalid status filter'),
  
  query('planType')
    .optional()
    .isIn(SUPPORTED_PLAN_TYPES)
    .withMessage('Invalid plan type filter'),
  
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

/**
 * Validation rules for initializing subscription payment
 */
export const initializeSubscriptionPaymentValidation = [
  param('subscriptionId')
    .isUUID()
    .withMessage('Subscription ID must be a valid UUID'),
  
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Callback URL must be a valid URL'),
  
  body('channels')
    .optional()
    .isArray()
    .withMessage('Channels must be an array')
];

