import express from 'express';
import subscriptionController from '../controllers/subscriptionController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  createSubscriptionValidation,
  updateSubscriptionValidation,
  cancelSubscriptionValidation,
  renewSubscriptionValidation,
  subscriptionIdValidation,
  getSubscriptionsValidation,
  initializeSubscriptionPaymentValidation
} from '../validations/subscriptionValidation.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       required:
 *         - userId
 *         - planType
 *         - billingCycle
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Subscription ID
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         planName:
 *           type: string
 *           description: Plan name
 *         planType:
 *           type: string
 *           enum: [basic, premium, enterprise, custom]
 *           description: Plan type
 *         status:
 *           type: string
 *           enum: [active, inactive, cancelled, expired, pending]
 *           description: Subscription status
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: End date
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly, custom]
 *           description: Billing cycle
 *         monthlyPrice:
 *           type: number
 *           format: decimal
 *           description: Monthly price
 *         yearlyPrice:
 *           type: number
 *           format: decimal
 *           description: Yearly price
 *         maxProperties:
 *           type: integer
 *           description: Maximum properties allowed
 *         maxPhotosPerProperty:
 *           type: integer
 *           description: Maximum photos per property
 *         featuredProperties:
 *           type: integer
 *           description: Number of featured properties allowed
 *         prioritySupport:
 *           type: boolean
 *           description: Priority support access
 *         analyticsAccess:
 *           type: boolean
 *           description: Analytics access
 *         autoRenew:
 *           type: boolean
 *           description: Auto-renewal enabled
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Update timestamp
 */

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/plans/{planType}:
 *   get:
 *     summary: Get plan details by type
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [basic, premium, enterprise]
 *     responses:
 *       200:
 *         description: Plan details retrieved successfully
 *       400:
 *         description: Invalid plan type
 *       500:
 *         description: Internal server error
 */
router.get('/plans/:planType', subscriptionController.getPlanDetails);

/**
 * @swagger
 * /api/subscriptions/my-subscription:
 *   get:
 *     summary: Get current user's active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/my-subscription',
  authenticateToken,
  subscriptionController.getUserSubscription
);

/**
 * @swagger
 * /api/subscriptions/limits:
 *   get:
 *     summary: Check subscription limits
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limitType
 *         schema:
 *           type: string
 *           enum: [properties, photos, featured]
 *         description: Type of limit to check
 *     responses:
 *       200:
 *         description: Limits retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/limits',
  authenticateToken,
  subscriptionController.checkLimits
);

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *               - billingCycle
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [basic, premium, enterprise, custom]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, custom]
 *               autoRenew:
 *                 type: boolean
 *               customPlan:
 *                 type: object
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       409:
 *         description: User already has an active subscription
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateToken,
  createSubscriptionValidation,
  handleValidationErrors,
  subscriptionController.createSubscription
);

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get all subscriptions (admin) or user's subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, cancelled, expired, pending]
 *       - in: query
 *         name: planType
 *         schema:
 *           type: string
 *           enum: [basic, premium, enterprise, custom]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID (admin only)
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateToken,
  getSubscriptionsValidation,
  handleValidationErrors,
  subscriptionController.getSubscriptions
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:subscriptionId',
  authenticateToken,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.getSubscriptionById
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}:
 *   put:
 *     summary: Update subscription
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, cancelled, expired, pending]
 *               autoRenew:
 *                 type: boolean
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, custom]
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:subscriptionId',
  authenticateToken,
  updateSubscriptionValidation,
  handleValidationErrors,
  subscriptionController.updateSubscription
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/activate:
 *   post:
 *     summary: Activate subscription (usually after payment)
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:subscriptionId/activate',
  authenticateToken,
  subscriptionIdValidation,
  handleValidationErrors,
  subscriptionController.activateSubscription
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:subscriptionId/cancel',
  authenticateToken,
  cancelSubscriptionValidation,
  handleValidationErrors,
  subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/renew:
 *   post:
 *     summary: Renew subscription
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, custom]
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       400:
 *         description: Invalid subscription status
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:subscriptionId/renew',
  authenticateToken,
  renewSubscriptionValidation,
  handleValidationErrors,
  subscriptionController.renewSubscription
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/payment:
 *   post:
 *     summary: Initialize subscription payment
 *     tags: [Subscriptions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callbackUrl:
 *                 type: string
 *                 format: uri
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Payment initialized successfully
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:subscriptionId/payment',
  authenticateToken,
  initializeSubscriptionPaymentValidation,
  handleValidationErrors,
  subscriptionController.initializePayment
);

export default router;

