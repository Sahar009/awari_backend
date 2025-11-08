import subscriptionService from '../services/subscriptionService.js';
import { validationResult } from 'express-validator';

class SubscriptionController {
  /**
   * Get all available subscription plans
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPlans(req, res) {
    try {
      const plans = await subscriptionService.getAllPlans();

      res.status(200).json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription plans',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get a specific plan details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPlanDetails(req, res) {
    try {
      const { planType } = req.params;

      const plan = await subscriptionService.getPlanDetails({
        slug: planType,
        planType
      });

      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('Get plan details error:', error);
      
      if (
        error.message === 'Selected subscription plan is unavailable' ||
        error.message === 'Subscription plan not found'
      ) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get plan details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Create a new subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.createSubscription(
        req.body,
        req.user.id
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Create subscription error:', error);
      
      if (error.message === 'User already has an active or pending subscription') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get user's active subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserSubscription(req, res) {
    try {
      const result = await subscriptionService.getUserSubscription(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get user subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all subscriptions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSubscriptions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.getSubscriptions(
        req.query,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscriptions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get subscription by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSubscriptionById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.getSubscriptionById(
        req.params.subscriptionId,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Get subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to view this subscription') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Activate subscription (usually called after payment)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async activateSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.activateSubscription(
        req.params.subscriptionId
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Activate subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to activate subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.updateSubscription(
        req.params.subscriptionId,
        req.body,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Update subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to update this subscription') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.cancelSubscription(
        req.params.subscriptionId,
        req.body.cancellationReason,
        req.user.id,
        req.user.role
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to cancel this subscription') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Renew subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async renewSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.renewSubscription(
        req.params.subscriptionId,
        req.body.billingCycle
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Renew subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('can be renewed')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to renew subscription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Initialize subscription payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initializePayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await subscriptionService.initializeSubscriptionPayment(
        req.params.subscriptionId,
        req.body,
        req.user.id
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(result.statusCode || 400).json(result);
      }
    } catch (error) {
      console.error('Initialize payment error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to pay for this subscription') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Subscription is already active') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check subscription limits
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkLimits(req, res) {
    try {
      const { limitType = 'properties' } = req.query;

      const result = await subscriptionService.checkSubscriptionLimits(
        req.user.id,
        limitType
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Check limits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check subscription limits',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new SubscriptionController();

