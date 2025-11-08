import { Subscription, SubscriptionPlan, User, Payment } from '../schema/index.js';
import { Op } from 'sequelize';
import subscriptionPlanService from './subscriptionPlanService.js';
import { createNotification } from './notificationService.js';

const PLAN_ATTRIBUTES = [
  'id',
  'name',
  'slug',
  'planType',
  'description',
  'monthlyPrice',
  'yearlyPrice',
  'currency',
  'maxProperties',
  'maxPhotosPerProperty',
  'featuredProperties',
  'prioritySupport',
  'analyticsAccess',
  'supportLevel',
  'trialPeriodDays',
  'isRecommended',
  'isActive'
];

/**
 * Subscription Service
 * Handles all subscription-related business logic
 */
class SubscriptionService {
  /**
   * Get subscription plan details
   * @param {Object} identifier - Plan identifier
   * @returns {Promise<Object>} Plan details
   */
  async getPlanDetails(identifier = {}) {
    const plan = await subscriptionPlanService.getPlanByIdentifier(identifier);
    if (!plan) {
      throw new Error('Selected subscription plan is unavailable');
    }
    return plan;
  }

  /**
   * Get all available plans
   * @returns {Promise<Array>} All available plans
   */
  async getAllPlans() {
    const plans = await subscriptionPlanService.getPublicPlans();
    return plans;
  }

  /**
   * Calculate subscription end date
   * @param {Date} startDate - Start date
   * @param {string} billingCycle - Billing cycle (monthly, yearly)
   * @returns {Date} End date
   */
  calculateEndDate(startDate, billingCycle) {
    const endDate = new Date(startDate);
    
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    return endDate;
  }

  /**
   * Calculate next billing date
   * @param {Date} currentDate - Current date
   * @param {string} billingCycle - Billing cycle
   * @returns {Date} Next billing date
   */
  calculateNextBillingDate(currentDate, billingCycle) {
    return this.calculateEndDate(currentDate, billingCycle);
  }

  /**
   * Create a new subscription
   * @param {Object} subscriptionData - Subscription data
   * @param {string} userId - User ID
   * @returns {Object} Created subscription
   */
  async createSubscription(subscriptionData, userId) {
    try {
      const {
        planId = null,
        planSlug = null,
        planType: incomingPlanType = 'basic',
        billingCycle = 'monthly',
        autoRenew = true,
        customPlan = null
      } = subscriptionData;

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        where: {
          userId,
          status: { [Op.in]: ['active', 'pending'] }
        }
      });

      if (existingSubscription) {
        throw new Error('User already has an active or pending subscription');
      }

      // Get plan details
      let planDetails = null;
      let resolvedPlanType = incomingPlanType;

      if (planId || planSlug || incomingPlanType) {
        planDetails = await subscriptionPlanService.getPlanByIdentifier(
          { id: planId, slug: planSlug, planType: incomingPlanType },
          { includeInactive: false }
        );

        if (planDetails) {
          resolvedPlanType = planDetails.planType;
        }
      }

      if (!planDetails && incomingPlanType === 'custom' && customPlan) {
        planDetails = {
          id: null,
          planName: customPlan.planName,
          planType: 'custom',
          monthlyPrice: customPlan.monthlyPrice,
          yearlyPrice: customPlan.yearlyPrice || customPlan.monthlyPrice * 12,
          maxProperties: customPlan.maxProperties,
          maxPhotosPerProperty: customPlan.maxPhotosPerProperty || 10,
          featuredProperties: customPlan.featuredProperties ?? 0,
          prioritySupport: customPlan.prioritySupport ?? false,
          analyticsAccess: customPlan.analyticsAccess ?? false,
          currency: customPlan.currency || 'NGN',
          features: customPlan.features || []
        };
      }

      if (!planDetails) {
        throw new Error('Selected subscription plan not found or inactive');
      }

      const monthlyPrice = Number(planDetails.monthlyPrice);
      const yearlyPrice = planDetails.yearlyPrice ? Number(planDetails.yearlyPrice) : monthlyPrice * 12;
      const currency = planDetails.currency || 'NGN';

      // Calculate pricing based on billing cycle
      const price =
        billingCycle === 'yearly'
          ? yearlyPrice
          : monthlyPrice;

      // Calculate dates
      const startDate = new Date();
      const endDate = billingCycle !== 'custom'
        ? this.calculateEndDate(startDate, billingCycle)
        : null;
      const nextBillingDate = billingCycle !== 'custom' && autoRenew
        ? this.calculateNextBillingDate(startDate, billingCycle)
        : null;

      // Create subscription
      const subscription = await Subscription.create({
        userId,
        planId: planDetails.id || null,
        planName: planDetails.planName,
        planType: resolvedPlanType,
        status: 'pending', // Will be activated after payment
        startDate,
        endDate,
        nextBillingDate,
        billingCycle,
        autoRenew,
        monthlyPrice,
        yearlyPrice,
        currency,
        maxProperties: planDetails.maxProperties,
        maxPhotosPerProperty: planDetails.maxPhotosPerProperty,
        featuredProperties: planDetails.featuredProperties,
        prioritySupport: planDetails.prioritySupport,
        analyticsAccess: planDetails.analyticsAccess,
        features: planDetails.features
      });

      // Load subscription with user details
      const subscriptionWithDetails = await Subscription.findByPk(subscription.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      return {
        success: true,
        message: 'Subscription created successfully. Please complete payment to activate.',
        data: subscriptionWithDetails
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's active subscription
   * @param {string} userId - User ID
   * @returns {Object} Active subscription or null
   */
  async getUserSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions with filters
   * @param {Object} filters - Filter options
   * @param {string} requesterId - ID of user making the request (for authorization)
   * @param {string} requesterRole - Role of requester
   * @returns {Object} Subscriptions with pagination
   */
  async getSubscriptions(filters = {}, requesterId = null, requesterRole = null) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        planType = null,
        userId = null
      } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      // Non-admin users can only see their own subscriptions
      if (requesterRole !== 'admin') {
        where.userId = requesterId;
      } else if (userId) {
        // Admin can filter by userId
        where.userId = userId;
      }

      if (status) {
        where.status = status;
      }

      if (planType) {
        where.planType = planType;
      }

      const { count, rows } = await Subscription.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          subscriptions: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @param {string} requesterId - ID of user making the request
   * @param {string} requesterRole - Role of requester
   * @returns {Object} Subscription details
   */
  async getSubscriptionById(subscriptionId, requesterId, requesterRole) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          },
          {
            model: Payment,
            as: 'payments',
            required: false,
            order: [['createdAt', 'DESC']],
            limit: 10
          }
        ]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check authorization
      if (requesterRole !== 'admin' && subscription.userId !== requesterId) {
        throw new Error('Unauthorized to view this subscription');
      }

      return {
        success: true,
        data: subscription
      };
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after payment
   * @param {string} subscriptionId - Subscription ID
   * @returns {Object} Updated subscription
   */
  async activateSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'active') {
        return {
          success: true,
          message: 'Subscription is already active',
          data: subscription
        };
      }

      // Calculate end date if not set
      let endDate = subscription.endDate;
      if (!endDate && subscription.billingCycle !== 'custom') {
        endDate = this.calculateEndDate(subscription.startDate, subscription.billingCycle);
      }

      // Calculate next billing date if auto-renew is enabled
      let nextBillingDate = subscription.nextBillingDate;
      if (subscription.autoRenew && !nextBillingDate && subscription.billingCycle !== 'custom') {
        nextBillingDate = this.calculateNextBillingDate(new Date(), subscription.billingCycle);
      }

      await subscription.update({
        status: 'active',
        endDate,
        nextBillingDate
      });

      // Send notification
      try {
        await createNotification({
          userId: subscription.userId,
          title: 'Subscription Activated',
          message: `Your ${subscription.planName} subscription has been activated successfully!`,
          type: 'success',
          category: 'subscription',
          priority: 'normal',
          channels: ['in_app', 'email'],
          actionUrl: `/subscriptions/${subscription.id}`,
          actionText: 'View Subscription'
        });
      } catch (notificationError) {
        console.warn('Failed to send subscription activation notification:', notificationError);
      }

      const updatedSubscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      return {
        success: true,
        message: 'Subscription activated successfully',
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} updateData - Update data
   * @param {string} requesterId - ID of user making the request
   * @param {string} requesterRole - Role of requester
   * @returns {Object} Updated subscription
   */
  async updateSubscription(subscriptionId, updateData, requesterId, requesterRole) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check authorization
      if (requesterRole !== 'admin' && subscription.userId !== requesterId) {
        throw new Error('Unauthorized to update this subscription');
      }

      // Only allow updating certain fields
      const allowedFields = ['status', 'autoRenew', 'billingCycle', 'nextBillingDate'];
      const updateFields = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      // Recalculate next billing date if billing cycle changed
      if (updateFields.billingCycle && subscription.autoRenew) {
        updateFields.nextBillingDate = this.calculateNextBillingDate(
          new Date(),
          updateFields.billingCycle
        );
      }

      await subscription.update(updateFields);

      const updatedSubscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      return {
        success: true,
        message: 'Subscription updated successfully',
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {string} cancellationReason - Reason for cancellation
   * @param {string} requesterId - ID of user making the request
   * @param {string} requesterRole - Role of requester
   * @returns {Object} Updated subscription
   */
  async cancelSubscription(subscriptionId, cancellationReason, requesterId, requesterRole) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check authorization
      if (requesterRole !== 'admin' && subscription.userId !== requesterId) {
        throw new Error('Unauthorized to cancel this subscription');
      }

      if (subscription.status === 'cancelled') {
        return {
          success: true,
          message: 'Subscription is already cancelled',
          data: subscription
        };
      }

      await subscription.update({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason,
        autoRenew: false
      });

      // Send notification
      try {
        await createNotification({
          userId: subscription.userId,
          title: 'Subscription Cancelled',
          message: `Your ${subscription.planName} subscription has been cancelled.`,
          type: 'info',
          category: 'subscription',
          priority: 'normal',
          channels: ['in_app', 'email'],
          actionUrl: `/subscriptions/${subscription.id}`,
          actionText: 'View Subscription'
        });
      } catch (notificationError) {
        console.warn('Failed to send subscription cancellation notification:', notificationError);
      }

      const updatedSubscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      return {
        success: true,
        message: 'Subscription cancelled successfully',
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Renew subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {string} billingCycle - Optional new billing cycle
   * @returns {Object} Updated subscription
   */
  async renewSubscription(subscriptionId, billingCycle = null) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active' && subscription.status !== 'expired') {
        throw new Error('Only active or expired subscriptions can be renewed');
      }

      const cycle = billingCycle || subscription.billingCycle;
      const newEndDate = this.calculateEndDate(new Date(), cycle);
      const newNextBillingDate = subscription.autoRenew
        ? this.calculateNextBillingDate(new Date(), cycle)
        : null;

      await subscription.update({
        status: 'active',
        startDate: new Date(),
        endDate: newEndDate,
        nextBillingDate: newNextBillingDate,
        billingCycle: cycle,
        cancelledAt: null,
        cancellationReason: null
      });

      // Send notification
      try {
        await createNotification({
          userId: subscription.userId,
          title: 'Subscription Renewed',
          message: `Your ${subscription.planName} subscription has been renewed successfully!`,
          type: 'success',
          category: 'subscription',
          priority: 'normal',
          channels: ['in_app', 'email'],
          actionUrl: `/subscriptions/${subscription.id}`,
          actionText: 'View Subscription'
        });
      } catch (notificationError) {
        console.warn('Failed to send subscription renewal notification:', notificationError);
      }

      const updatedSubscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      return {
        success: true,
        message: 'Subscription renewed successfully',
        data: updatedSubscription
      };
    } catch (error) {
      console.error('Error renewing subscription:', error);
      throw error;
    }
  }

  /**
   * Initialize subscription payment
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} paymentData - Payment data
   * @param {string} userId - User ID
   * @returns {Object} Payment initialization result
   */
  async initializeSubscriptionPayment(subscriptionId, paymentData, userId) {
    try {
      const subscription = await Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'role']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: PLAN_ATTRIBUTES,
            required: false
          }
        ]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.userId !== userId) {
        throw new Error('Unauthorized to pay for this subscription');
      }

      if (subscription.status === 'active') {
        throw new Error('Subscription is already active');
      }

      // Calculate amount based on billing cycle
      const amount = subscription.billingCycle === 'yearly'
        ? subscription.yearlyPrice
        : subscription.monthlyPrice;

      // Use payment service to initialize payment
      const { initializeSubscriptionPayment } = await import('./paymentService.js');
      const { User } = await import('../schema/index.js');
      
      // Get user if not already loaded
      let user = subscription.user;
      if (!user) {
        user = await User.findByPk(subscription.userId, {
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'role']
        });
      }
      
      const paymentResult = await initializeSubscriptionPayment(
        user,
        subscriptionId,
        {
          amount,
          currency: subscription.currency || 'NGN',
          callbackUrl: paymentData.callbackUrl,
          channels: paymentData.channels
        }
      );

      return paymentResult;
    } catch (error) {
      console.error('Error initializing subscription payment:', error);
      throw error;
    }
  }

  /**
   * Check subscription limits
   * @param {string} userId - User ID
   * @param {string} limitType - Type of limit to check (properties, photos, featured)
   * @returns {Object} Limit information
   */
  async checkSubscriptionLimits(userId, limitType = 'properties') {
    try {
      const subscription = await Subscription.findOne({
        where: {
          userId,
          status: 'active'
        }
      });

      if (!subscription) {
        return {
          success: false,
          message: 'No active subscription found',
          hasLimit: true,
          limit: 0,
          current: 0
        };
      }

      let limit = 0;
      let current = 0;

      switch (limitType) {
        case 'properties':
          limit = subscription.maxProperties === -1 ? Infinity : subscription.maxProperties;
          // Count user's active properties
          const { Property } = await import('../schema/index.js');
          current = await Property.count({
            where: {
              ownerId: userId,
              status: { [Op.in]: ['active', 'pending'] }
            }
          });
          break;
        case 'photos':
          limit = subscription.maxPhotosPerProperty;
          break;
        case 'featured':
          limit = subscription.featuredProperties === -1 ? Infinity : subscription.featuredProperties;
          // Count user's featured properties
          const { Property: PropertyModel } = await import('../schema/index.js');
          current = await PropertyModel.count({
            where: {
              ownerId: userId,
              featured: true,
              status: 'active'
            }
          });
          break;
        default:
          throw new Error(`Unknown limit type: ${limitType}`);
      }

      return {
        success: true,
        hasLimit: limit !== Infinity,
        limit,
        current,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - current),
        subscription: {
          planName: subscription.planName,
          planType: subscription.planType
        }
      };
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      throw error;
    }
  }
}

export default new SubscriptionService();

