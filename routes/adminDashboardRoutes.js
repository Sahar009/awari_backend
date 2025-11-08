import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  getOverviewStats,
  getUsers,
  createAdminUser,
  getUserDetails,
  updateUserStatus,
  updateUserRole,
  updateUserProfile,
  getModerationOverview,
  getModerationReviews,
  getModerationListings,
  getModerationKycDocuments,
  getModerationPayments,
  updateKycDocument,
  getTransactions,
  getProperties,
  getPropertyDetails,
  updatePropertyStatus,
  updatePropertyFeature,
  getPendingProperties,
  moderateProperty,
  getSubscriptionPlans,
  getSubscriptionPlanDetail,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  toggleSubscriptionPlanStatus,
  getSubscriptions,
  getSubscriptionDetail,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  getReportsMetrics
} from '../controllers/adminDashboardController.js';
import {
  overviewValidation,
  usersValidation,
  createAdminUserValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  userIdParamValidation,
  updateUserProfileValidation,
  propertiesValidation,
  propertiesManagementValidation,
  moderationReviewsValidation,
  moderationListingsValidation,
  moderationKycValidation,
  moderationPaymentsValidation,
  updateKycDocumentValidation,
  transactionsValidation,
  subscriptionIdParamValidation,
  createSubscriptionValidation,
  updateSubscriptionValidation,
  cancelSubscriptionValidation,
  renewSubscriptionValidation,
  propertyIdParamValidation,
  updatePropertyStatusValidation,
  updatePropertyFeatureValidation,
  moderatePropertyValidation,
  subscriptionsValidation,
  subscriptionPlansValidation,
  subscriptionPlanIdParamValidation,
  createSubscriptionPlanValidation,
  updateSubscriptionPlanValidation,
  toggleSubscriptionPlanStatusValidation,
  reportsMetricsValidation
} from '../validations/adminDashboardValidation.js';
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

router.use(authenticateToken, requireRole('admin'));

router.get('/overview', overviewValidation, handleValidationErrors, getOverviewStats);
router.get('/users', usersValidation, handleValidationErrors, getUsers);
router.post('/users/admin', createAdminUserValidation, handleValidationErrors, createAdminUser);
router.get('/users/:userId', userIdParamValidation, handleValidationErrors, getUserDetails);
router.put('/users/:userId/status', updateUserStatusValidation, handleValidationErrors, updateUserStatus);
router.put('/users/:userId/role', updateUserRoleValidation, handleValidationErrors, updateUserRole);
router.put('/users/:userId/profile', updateUserProfileValidation, handleValidationErrors, updateUserProfile);
router.get('/moderation/overview', getModerationOverview);
router.get('/moderation/reviews', moderationReviewsValidation, handleValidationErrors, getModerationReviews);
router.get('/moderation/listings', moderationListingsValidation, handleValidationErrors, getModerationListings);
router.get('/moderation/kyc', moderationKycValidation, handleValidationErrors, getModerationKycDocuments);
router.get('/moderation/payments', moderationPaymentsValidation, handleValidationErrors, getModerationPayments);
router.put('/moderation/kyc/:documentId', updateKycDocumentValidation, handleValidationErrors, updateKycDocument);
router.get('/transactions', transactionsValidation, handleValidationErrors, getTransactions);
router.get('/properties', propertiesManagementValidation, handleValidationErrors, getProperties);
router.get('/properties/pending', propertiesValidation, handleValidationErrors, getPendingProperties);
router.get('/properties/:propertyId', propertyIdParamValidation, handleValidationErrors, getPropertyDetails);
router.put('/properties/:propertyId/status', updatePropertyStatusValidation, handleValidationErrors, updatePropertyStatus);
router.put('/properties/:propertyId/feature', updatePropertyFeatureValidation, handleValidationErrors, updatePropertyFeature);
router.put('/properties/:propertyId/moderate', moderatePropertyValidation, handleValidationErrors, moderateProperty);
router.get('/subscription-plans', subscriptionPlansValidation, handleValidationErrors, getSubscriptionPlans);
router.get('/subscription-plans/:planId', subscriptionPlanIdParamValidation, handleValidationErrors, getSubscriptionPlanDetail);
router.post('/subscription-plans', createSubscriptionPlanValidation, handleValidationErrors, createSubscriptionPlan);
router.put('/subscription-plans/:planId', updateSubscriptionPlanValidation, handleValidationErrors, updateSubscriptionPlan);
router.post('/subscription-plans/:planId/status', toggleSubscriptionPlanStatusValidation, handleValidationErrors, toggleSubscriptionPlanStatus);
router.get('/subscriptions', subscriptionsValidation, handleValidationErrors, getSubscriptions);
router.post('/subscriptions', createSubscriptionValidation, handleValidationErrors, createSubscription);
router.get('/subscriptions/:subscriptionId', subscriptionIdParamValidation, handleValidationErrors, getSubscriptionDetail);
router.put('/subscriptions/:subscriptionId', updateSubscriptionValidation, handleValidationErrors, updateSubscription);
router.post('/subscriptions/:subscriptionId/cancel', cancelSubscriptionValidation, handleValidationErrors, cancelSubscription);
router.post('/subscriptions/:subscriptionId/renew', renewSubscriptionValidation, handleValidationErrors, renewSubscription);
router.get('/reports/metrics', reportsMetricsValidation, handleValidationErrors, getReportsMetrics);

export default router;


