import { Notification, User, Property, Booking } from '../schema/index.js';
import { sendEmail } from '../modules/notifications/email.js';
import { pushNotificationService } from '../modules/notifications/push.js';
import { sendSMS } from '../modules/notifications/sms.js';
import {
  NotificationTypes,
  NotificationCategories,
  NotificationPriority,
  NotificationChannels,
  NotificationStatus
} from '../modules/notifications/types.js';
import { Op } from 'sequelize';

/**
 * Comprehensive Notification Service
 * Handles all notification operations including creation, delivery, and management
 */

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Object} Created notification
 */
export const createNotification = async (notificationData) => {
  try {
    const {
      userId,
      title,
      message,
      type = 'info',
      category = 'system',
      priority = 'normal',
      channels = ['in_app'],
      actionUrl = null,
      actionText = null,
      propertyId = null,
      bookingId = null,
      paymentId = null,
      scheduledAt = null,
      expiresAt = null,
      data = null,
      metadata = null
    } = notificationData;

    // Validate required fields
    if (!userId || !title || !message) {
      throw new Error('userId, title, and message are required');
    }

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create notification
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      category,
      priority,
      channels,
      actionUrl,
      actionText,
      propertyId,
      bookingId,
      paymentId,
      scheduledAt,
      expiresAt,
      data,
      metadata,
      status: 'unread',
      isRead: false
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

/**
 * Send notification through specified channels
 * @param {string} notificationId - Notification ID
 * @param {Array} channels - Channels to send through
 * @returns {Object} Delivery results
 */
export const sendNotification = async (notificationId, channels = null) => {
  try {
    const notification = await Notification.findByPk(notificationId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'pushToken']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address'],
          required: false
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkInDate', 'checkOutDate'],
          required: false
        }
      ]
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const deliveryChannels = channels || notification.channels;
    const results = {
      email: { sent: false, error: null },
      sms: { sent: false, error: null },
      push: { sent: false, error: null },
      in_app: { sent: true, error: null } // In-app is always "sent" when created
    };

    // Send email notification
    if (deliveryChannels.includes('email') && notification.user.email) {
      try {
        const emailSent = await sendEmail({
          to: notification.user.email,
          subject: notification.title,
          text: notification.message,
          template: getEmailTemplate(notification.type),
          context: {
            user: notification.user,
            notification,
            property: notification.property,
            booking: notification.booking,
            actionUrl: notification.actionUrl,
            actionText: notification.actionText
          }
        });

        results.email.sent = emailSent;
        if (emailSent) {
          await notification.update({ emailSent: true });
        }
      } catch (error) {
        console.error('Error sending email notification:', error);
        results.email.error = error.message;
      }
    }

    // Send SMS notification
    if (deliveryChannels.includes('sms') && notification.user.phone) {
      try {
        const smsSent = await sendSMS(notification.user.phone, notification.message);
        results.sms.sent = smsSent;
        if (smsSent) {
          await notification.update({ smsSent: true });
        }
      } catch (error) {
        console.error('Error sending SMS notification:', error);
        results.sms.error = error.message;
      }
    }

    // Send push notification
    if (deliveryChannels.includes('push') && notification.user.pushToken) {
      try {
        const pushResult = await pushNotificationService.sendToDevice(notification.user.pushToken, {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification.id,
            type: notification.type,
            category: notification.category,
            actionUrl: notification.actionUrl
          }
        });

        // Check if push notification was successful
        // Expo returns { success: true, tickets } or { success: false, error }
        // FCM returns a message ID string or throws error
        if (pushResult && (pushResult.success === true || typeof pushResult === 'string')) {
          results.push.sent = true;
          await notification.update({ pushSent: true });
        } else {
          results.push.sent = false;
          results.push.error = pushResult?.error || 'Push notification failed';
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
        results.push.error = error.message;
      }
    }

    // Update notification status
    const allChannelsSent = Object.values(results).every(result => result.sent);
    await notification.update({
      status: allChannelsSent ? 'sent' : 'failed'
    });

    return results;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Failed to send notification');
  }
};

/**
 * Create and send notification in one operation
 * @param {Object} notificationData - Notification data
 * @returns {Object} Created notification and delivery results
 */
export const createAndSendNotification = async (notificationData) => {
  try {
    const notification = await createNotification(notificationData);
    const deliveryResults = await sendNotification(notification.id);
    
    return {
      notification,
      deliveryResults
    };
  } catch (error) {
    console.error('Error creating and sending notification:', error);
    throw new Error('Failed to create and send notification');
  }
};

/**
 * Get user notifications
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Paginated notifications
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = null,
      category = null,
      type = null,
      unreadOnly = false,
      includeArchived = false
    } = options;

    const whereClause = { userId };

    if (status) {
      whereClause.status = status;
    }

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.type = type;
    }

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    if (!includeArchived) {
      whereClause.status = {
        [Op.ne]: 'archived'
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address'],
          required: false
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkInDate', 'checkOutDate'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      notifications: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw new Error('Failed to get user notifications');
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.update({
      isRead: true,
      readAt: new Date(),
      status: 'read'
    });

    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

/**
 * Mark all user notifications as read
 * @param {string} userId - User ID
 * @returns {number} Number of notifications marked as read
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.update(
      {
        isRead: true,
        readAt: new Date(),
        status: 'read'
      },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );

    return result[0];
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
};

/**
 * Archive notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const archiveNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.update({
      status: 'archived'
    });

    return true;
  } catch (error) {
    console.error('Error archiving notification:', error);
    throw new Error('Failed to archive notification');
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.destroy({
      where: {
        id: notificationId,
        userId
      }
    });

    return result > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
};

/**
 * Get notification statistics for a user
 * @param {string} userId - User ID
 * @returns {Object} Notification statistics
 */
export const getNotificationStats = async (userId) => {
  try {
    const stats = await Notification.findAll({
      where: { userId },
      attributes: [
        'status',
        'category',
        'isRead',
        [Notification.sequelize.fn('COUNT', Notification.sequelize.col('id')), 'count']
      ],
      group: ['status', 'category', 'isRead']
    });

    const total = await Notification.count({ where: { userId } });
    const unread = await Notification.count({ 
      where: { userId, isRead: false, status: { [Op.ne]: 'archived' } }
    });

    return {
      total,
      unread,
      byStatus: stats.reduce((acc, stat) => {
        const key = stat.status;
        if (!acc[key]) acc[key] = 0;
        acc[key] += parseInt(stat.dataValues.count);
        return acc;
      }, {}),
      byCategory: stats.reduce((acc, stat) => {
        const key = stat.category;
        if (!acc[key]) acc[key] = 0;
        acc[key] += parseInt(stat.dataValues.count);
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting notification stats:', error);
    throw new Error('Failed to get notification statistics');
  }
};

/**
 * Send bulk notifications to multiple users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} notificationData - Notification data (without userId)
 * @returns {Object} Results
 */
export const sendBulkNotifications = async (userIds, notificationData) => {
  try {
    const results = {
      successful: [],
      failed: []
    };

    for (const userId of userIds) {
      try {
        const notification = await createAndSendNotification({
          ...notificationData,
          userId
        });
        results.successful.push({ userId, notificationId: notification.notification.id });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw new Error('Failed to send bulk notifications');
  }
};

/**
 * Send notification to users by topic/role
 * @param {string} topic - Notification topic
 * @param {Object} notificationData - Notification data
 * @returns {Object} Results
 */
export const sendNotificationByTopic = async (topic, notificationData) => {
  try {
    let userIds = [];

    // Get user IDs based on topic
    switch (topic) {
      case 'property_owners':
        const owners = await User.findAll({
          where: { role: 'property_owner' },
          attributes: ['id']
        });
        userIds = owners.map(owner => owner.id);
        break;
      
      case 'guests':
        const guests = await User.findAll({
          where: { role: 'guest' },
          attributes: ['id']
        });
        userIds = guests.map(guest => guest.id);
        break;
      
      case 'all_users':
        const allUsers = await User.findAll({
          attributes: ['id']
        });
        userIds = allUsers.map(user => user.id);
        break;
      
      default:
        throw new Error('Invalid topic');
    }

    return await sendBulkNotifications(userIds, notificationData);
  } catch (error) {
    console.error('Error sending notification by topic:', error);
    throw new Error('Failed to send notification by topic');
  }
};

/**
 * Get email template name for notification type
 * @param {string} type - Notification type
 * @returns {string} Template name
 */
const getEmailTemplate = (type) => {
  const templateMap = {
    [NotificationTypes.WELCOME]: 'welcome',
    [NotificationTypes.EMAIL_VERIFICATION]: 'email-verification',
    [NotificationTypes.PASSWORD_RESET]: 'password-reset',
    [NotificationTypes.PASSWORD_CHANGED]: 'password-changed',
    [NotificationTypes.BOOKING_CONFIRMED]: 'booking-confirmed',
    [NotificationTypes.BOOKING_CANCELLED]: 'booking-cancelled',
    [NotificationTypes.PROPERTY_APPROVED]: 'property-approved',
    [NotificationTypes.PROPERTY_REJECTED]: 'property-rejected',
    [NotificationTypes.PAYMENT_SUCCESS]: 'payment-success',
    [NotificationTypes.PAYMENT_FAILED]: 'payment-failed',
    'BOOKING_RECEIPT': 'booking-receipt'
  };

  return templateMap[type] || 'default';
};

/**
 * Predefined notification templates for common scenarios
 */
export const NotificationTemplates = {
  // User related
  WELCOME: (user) => ({
    title: `Welcome to AWARI, ${user.firstName}!`,
    message: `Hi ${user.firstName}, welcome to AWARI! We're excited to have you join our community. Start exploring amazing properties and book your next stay.`,
    type: 'success',
    category: 'system',
    priority: 'normal',
    channels: ['email', 'in_app'],
    actionUrl: '/dashboard',
    actionText: 'Go to Dashboard'
  }),

  EMAIL_VERIFICATION: (user, verificationUrl) => ({
    title: 'Verify Your Email Address',
    message: `Hi ${user.firstName}, please verify your email address to complete your registration. Click the link below to verify.`,
    type: 'info',
    category: 'system',
    priority: 'high',
    channels: ['email'],
    actionUrl: verificationUrl,
    actionText: 'Verify Email'
  }),

  PASSWORD_RESET: (user, resetUrl) => ({
    title: 'Reset Your Password',
    message: `Hi ${user.firstName}, you requested to reset your password. Click the link below to reset it.`,
    type: 'warning',
    category: 'system',
    priority: 'high',
    channels: ['email'],
    actionUrl: resetUrl,
    actionText: 'Reset Password'
  }),

  // Booking related
  BOOKING_CONFIRMED: (user, booking) => ({
    title: 'Booking Confirmed!',
    message: `Hi ${user.firstName}, your booking for ${booking.property?.title || 'the property'} has been confirmed. Check-in: ${booking.checkInDate}`,
    type: 'success',
    category: 'booking',
    priority: 'high',
    channels: ['email', 'push', 'in_app'],
    actionUrl: `/bookings/${booking.id}`,
    actionText: 'View Booking'
  }),

  BOOKING_CANCELLED: (user, booking) => ({
    title: 'Booking Cancelled',
    message: `Hi ${user.firstName}, your booking for ${booking.property?.title || 'the property'} has been cancelled.`,
    type: 'warning',
    category: 'booking',
    priority: 'normal',
    channels: ['email', 'push', 'in_app'],
    actionUrl: `/bookings/${booking.id}`,
    actionText: 'View Details'
  }),

  // Property related
  PROPERTY_APPROVED: (user, property) => ({
    title: 'Property Approved!',
    message: `Hi ${user.firstName}, your property "${property.title}" has been approved and is now live on our platform.`,
    type: 'success',
    category: 'property',
    priority: 'high',
    channels: ['email', 'push', 'in_app'],
    actionUrl: `/properties/${property.id}`,
    actionText: 'View Property'
  }),

  PROPERTY_REJECTED: (user, property, reason) => ({
    title: 'Property Rejected',
    message: `Hi ${user.firstName}, your property "${property.title}" has been rejected. Reason: ${reason}`,
    type: 'error',
    category: 'property',
    priority: 'normal',
    channels: ['email', 'in_app'],
    actionUrl: `/properties/${property.id}`,
    actionText: 'View Details'
  }),

  // Payment related
  PAYMENT_SUCCESS: (user, payment) => ({
    title: 'Payment Successful!',
    message: `Hi ${user.firstName}, your payment of ₦${payment.amount} has been processed successfully.`,
    type: 'success',
    category: 'payment',
    priority: 'high',
    channels: ['email', 'push', 'in_app'],
    actionUrl: `/payments/${payment.id}`,
    actionText: 'View Payment'
  }),

  PAYMENT_FAILED: (user, payment) => ({
    title: 'Payment Failed',
    message: `Hi ${user.firstName}, your payment of ₦${payment.amount} failed. Please try again.`,
    type: 'error',
    category: 'payment',
    priority: 'high',
    channels: ['email', 'push', 'in_app'],
    actionUrl: `/payments/${payment.id}`,
    actionText: 'Retry Payment'
  })
};

/**
 * Send predefined notification using template
 * @param {string} templateName - Template name
 * @param {Object} user - User object
 * @param {Object} additionalData - Additional data for template
 * @returns {Object} Created notification and delivery results
 */
export const sendTemplateNotification = async (templateName, user, additionalData = {}) => {
  try {
    const template = NotificationTemplates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const templateData = template(user, additionalData);
    
    return await createAndSendNotification({
      userId: user.id,
      ...templateData,
      propertyId: additionalData.property?.id || null,
      bookingId: additionalData.booking?.id || null,
      paymentId: additionalData.payment?.id || null
    });
  } catch (error) {
    console.error('Error sending template notification:', error);
    throw new Error('Failed to send template notification');
  }
};
