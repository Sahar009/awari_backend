import { body, param, query } from 'express-validator';

/**
 * Predefined subscription plans
 */
export const SUBSCRIPTION_PLANS = {
  basic: {
    planName: 'Basic Plan',
    planType: 'basic',
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    maxProperties: 5,
    maxPhotosPerProperty: 10,
    featuredProperties: 0,
    prioritySupport: false,
    analyticsAccess: false,
    features: ['Basic listing', 'Email support', '5 properties max']
  },
  premium: {
    planName: 'Premium Plan',
    planType: 'premium',
    monthlyPrice: 15000,
    yearlyPrice: 150000,
    maxProperties: 20,
    maxPhotosPerProperty: 25,
    featuredProperties: 3,
    prioritySupport: true,
    analyticsAccess: true,
    features: ['Unlimited listings', 'Priority support', 'Analytics', '3 featured properties', 'Advanced tools']
  },
  enterprise: {
    planName: 'Enterprise Plan',
    planType: 'enterprise',
    monthlyPrice: 50000,
    yearlyPrice: 500000,
    maxProperties: -1, // Unlimited
    maxPhotosPerProperty: 50,
    featuredProperties: -1, // Unlimited
    prioritySupport: true,
    analyticsAccess: true,
    features: ['Unlimited everything', 'Dedicated support', 'Advanced analytics', 'Custom features', 'API access']
  }
};

/**
 * Validation rules for creating a subscription
 */
export const createSubscriptionValidation = [
  body('planType')
    .isIn(['basic', 'premium', 'enterprise', 'custom'])
    .withMessage('Plan type must be one of: basic, premium, enterprise, custom'),
  
  body('billingCycle')
    .isIn(['monthly', 'yearly', 'custom'])
    .withMessage('Billing cycle must be one of: monthly, yearly, custom'),
  
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renew must be a boolean'),
  
  body('customPlan')
    .optional()
    .isObject()
    .withMessage('Custom plan must be an object'),
  
  body('customPlan.planName')
    .if(body('planType').equals('custom'))
    .notEmpty()
    .withMessage('Plan name is required for custom plans'),
  
  body('customPlan.monthlyPrice')
    .if(body('planType').equals('custom'))
    .isFloat({ min: 0 })
    .withMessage('Monthly price must be a positive number'),
  
  body('customPlan.maxProperties')
    .if(body('planType').equals('custom'))
    .isInt({ min: 1 })
    .withMessage('Max properties must be a positive integer')
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
    .isIn(['basic', 'premium', 'enterprise', 'custom'])
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

