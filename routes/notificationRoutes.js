import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  createNotification,
  sendNotification,
  createAndSendNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationStats,
  sendBulkNotifications,
  sendNotificationByTopic,
  sendTemplateNotification
} from '../services/notificationService.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - userId
 *         - title
 *         - message
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Notification ID
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, reminder, announcement]
 *           description: Notification type
 *         category:
 *           type: string
 *           enum: [booking, payment, property, message, system, reminder]
 *           description: Notification category
 *         priority:
 *           type: string
 *           enum: [urgent, high, normal, low]
 *           description: Notification priority
 *         status:
 *           type: string
 *           enum: [unread, read, archived]
 *           description: Notification status
 *         isRead:
 *           type: boolean
 *           description: Whether notification is read
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: When notification was read
 *         channels:
 *           type: array
 *           items:
 *             type: string
 *             enum: [email, sms, push, in_app]
 *           description: Delivery channels
 *         actionUrl:
 *           type: string
 *           description: Action URL
 *         actionText:
 *           type: string
 *           description: Action button text
 *         propertyId:
 *           type: string
 *           format: uuid
 *           description: Related property ID
 *         bookingId:
 *           type: string
 *           format: uuid
 *           description: Related booking ID
 *         paymentId:
 *           type: string
 *           format: uuid
 *           description: Related payment ID
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: When to send notification
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When notification expires
 *         emailSent:
 *           type: boolean
 *           description: Whether email was sent
 *         smsSent:
 *           type: boolean
 *           description: Whether SMS was sent
 *         pushSent:
 *           type: boolean
 *           description: Whether push notification was sent
 *         data:
 *           type: object
 *           description: Additional data
 *         metadata:
 *           type: object
 *           description: Metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     NotificationTemplate:
 *       type: object
 *       properties:
 *         templateName:
 *           type: string
 *           enum: [WELCOME, EMAIL_VERIFICATION, PASSWORD_RESET, BOOKING_CONFIRMED, BOOKING_CANCELLED, PROPERTY_APPROVED, PROPERTY_REJECTED, PAYMENT_SUCCESS, PAYMENT_FAILED]
 *           description: Template name
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         additionalData:
 *           type: object
 *           description: Additional data for template
 *     
 *     NotificationStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total notifications
 *         unread:
 *           type: integer
 *           description: Unread notifications
 *         byStatus:
 *           type: object
 *           description: Notifications by status
 *         byCategory:
 *           type: object
 *           description: Notifications by category
 *     
 *     NotificationPagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           description: Current page
 *         limit:
 *           type: integer
 *           description: Items per page
 *         total:
 *           type: integer
 *           description: Total items
 *         pages:
 *           type: integer
 *           description: Total pages
 *     
 *     NotificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Success status
 *         message:
 *           type: string
 *           description: Response message
 *         data:
 *           type: object
 *           description: Response data
 *         error:
 *           type: string
 *           description: Error message
 *     
 *     BulkNotificationRequest:
 *       type: object
 *       required:
 *         - userIds
 *         - title
 *         - message
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: Array of user IDs
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, reminder, announcement]
 *         category:
 *           type: string
 *           enum: [booking, payment, property, message, system, reminder]
 *         priority:
 *           type: string
 *           enum: [urgent, high, normal, low]
 *         channels:
 *           type: array
 *           items:
 *             type: string
 *             enum: [email, sms, push, in_app]
 *     
 *     TopicNotificationRequest:
 *       type: object
 *       required:
 *         - topic
 *         - title
 *         - message
 *       properties:
 *         topic:
 *           type: string
 *           enum: [property_owners, guests, all_users]
 *           description: Target topic
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, reminder, announcement]
 *         category:
 *           type: string
 *           enum: [booking, payment, property, message, system, reminder]
 *         priority:
 *           type: string
 *           enum: [urgent, high, normal, low]
 *         channels:
 *           type: array
 *           items:
 *             type: string
 *             enum: [email, sms, push, in_app]
 *     
 *     DeliveryResults:
 *       type: object
 *       properties:
 *         email:
 *           type: object
 *           properties:
 *             sent:
 *               type: boolean
 *             error:
 *               type: string
 *         sms:
 *           type: object
 *           properties:
 *             sent:
 *               type: boolean
 *             error:
 *               type: string
 *         push:
 *           type: object
 *           properties:
 *             sent:
 *               type: boolean
 *             error:
 *               type: string
 *         in_app:
 *           type: object
 *           properties:
 *             sent:
 *               type: boolean
 *             error:
 *               type: string
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: Notification management endpoints
 * 
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *           example:
 *             userId: "123e4567-e89b-12d3-a456-426614174000"
 *             title: "Welcome to AWARI!"
 *             message: "Thank you for joining our platform."
 *             type: "success"
 *             category: "system"
 *             priority: "normal"
 *             channels: ["email", "in_app"]
 *             actionUrl: "/dashboard"
 *             actionText: "Get Started"
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Notification'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const notification = await createNotification(req.body);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Create and send notification immediately
 *     description: Creates a notification and immediately sends it through the specified channels
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *           example:
 *             userId: "123e4567-e89b-12d3-a456-426614174000"
 *             title: "Booking Confirmed!"
 *             message: "Your booking has been confirmed successfully."
 *             type: "success"
 *             category: "booking"
 *             priority: "high"
 *             channels: ["email", "push", "in_app"]
 *             actionUrl: "/bookings/123"
 *             actionText: "View Booking"
 *             bookingId: "123e4567-e89b-12d3-a456-426614174001"
 *     responses:
 *       200:
 *         description: Notification created and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notification:
 *                           $ref: '#/components/schemas/Notification'
 *                         deliveryResults:
 *                           $ref: '#/components/schemas/DeliveryResults'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const result = await createAndSendNotification(req.body);

    res.json({
      success: true,
      message: 'Notification created and sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating and sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create and send notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/template:
 *   post:
 *     summary: Send notification using predefined template
 *     description: Sends a notification using one of the predefined templates with automatic content generation
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationTemplate'
 *           examples:
 *             welcome:
 *               summary: Welcome notification
 *               value:
 *                 templateName: "WELCOME"
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *             booking_confirmed:
 *               summary: Booking confirmation
 *               value:
 *                 templateName: "BOOKING_CONFIRMED"
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 additionalData:
 *                   booking:
 *                     id: "123e4567-e89b-12d3-a456-426614174001"
 *                     checkInDate: "2024-01-15"
 *                     checkOutDate: "2024-01-18"
 *                   property:
 *                     id: "123e4567-e89b-12d3-a456-426614174002"
 *                     title: "Beautiful Apartment"
 *                     address: "123 Main St"
 *             property_approved:
 *               summary: Property approval
 *               value:
 *                 templateName: "PROPERTY_APPROVED"
 *                 userId: "123e4567-e89b-12d3-a456-426614174000"
 *                 additionalData:
 *                   property:
 *                     id: "123e4567-e89b-12d3-a456-426614174002"
 *                     title: "My Property"
 *                     address: "456 Oak Ave"
 *     responses:
 *       200:
 *         description: Template notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notification:
 *                           $ref: '#/components/schemas/Notification'
 *                         deliveryResults:
 *                           $ref: '#/components/schemas/DeliveryResults'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.post('/template', authenticateToken, async (req, res) => {
  try {
    const { templateName, userId, additionalData = {} } = req.body;

    if (!templateName || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Template name and user ID are required'
      });
    }

    // Get user data
    const { User } = await import('../schema/index.js');
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const result = await sendTemplateNotification(templateName, user, additionalData);

    res.json({
      success: true,
      message: 'Template notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending template notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send template notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/bulk:
 *   post:
 *     summary: Send notifications to multiple users
 *     description: Sends the same notification to multiple users at once
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkNotificationRequest'
 *           example:
 *             userIds: 
 *               - "123e4567-e89b-12d3-a456-426614174000"
 *               - "123e4567-e89b-12d3-a456-426614174001"
 *               - "123e4567-e89b-12d3-a456-426614174002"
 *             title: "System Maintenance Notice"
 *             message: "Scheduled maintenance will occur tonight at 2 AM. The system will be unavailable for 2 hours."
 *             type: "warning"
 *             category: "system"
 *             priority: "normal"
 *             channels: ["email", "in_app"]
 *     responses:
 *       200:
 *         description: Bulk notifications sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         successful:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 format: uuid
 *                               notificationId:
 *                                 type: string
 *                                 format: uuid
 *                         failed:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 format: uuid
 *                               error:
 *                                 type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { userIds, ...notificationData } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required and must not be empty'
      });
    }

    const result = await sendBulkNotifications(userIds, notificationData);

    res.json({
      success: true,
      message: 'Bulk notifications sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/topic:
 *   post:
 *     summary: Send notification by user topic/role
 *     description: Sends notifications to all users with a specific role or topic (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TopicNotificationRequest'
 *           examples:
 *             property_owners:
 *               summary: Notify all property owners
 *               value:
 *                 topic: "property_owners"
 *                 title: "New Feature Available"
 *                 message: "Check out our new property analytics dashboard in your dashboard."
 *                 type: "info"
 *                 category: "property"
 *                 priority: "normal"
 *                 channels: ["email", "in_app"]
 *             all_users:
 *               summary: Notify all users
 *               value:
 *                 topic: "all_users"
 *                 title: "Platform Update"
 *                 message: "We've made some improvements to enhance your experience on AWARI."
 *                 type: "announcement"
 *                 category: "system"
 *                 priority: "normal"
 *                 channels: ["email", "in_app"]
 *     responses:
 *       200:
 *         description: Topic notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         successful:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 format: uuid
 *                               notificationId:
 *                                 type: string
 *                                 format: uuid
 *                         failed:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 format: uuid
 *                               error:
 *                                 type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.post('/topic', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { topic, ...notificationData } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const result = await sendNotificationByTopic(topic, notificationData);

    res.json({
      success: true,
      message: 'Topic notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending topic notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send topic notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/user/{userId}:
 *   get:
 *     summary: Get user notifications with filtering and pagination
 *     description: Retrieves notifications for a specific user with optional filtering and pagination
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of notifications per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, archived]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [booking, payment, property, message, system, reminder]
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, reminder, announcement]
 *         description: Filter by type
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only unread notifications
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include archived notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             allOf:
 *                               - $ref: '#/components/schemas/Notification'
 *                               - type: object
 *                                 properties:
 *                                   property:
 *                                     type: object
 *                                     description: Related property data
 *                                   booking:
 *                                     type: object
 *                                     description: Related booking data
 *                         pagination:
 *                           $ref: '#/components/schemas/NotificationPagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       403:
 *         description: Forbidden - Cannot access other user notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const options = req.query;

    // Check if user can access these notifications
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other user notifications'
      });
    }

    const result = await getUserNotifications(userId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user notifications',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a specific notification as read
 *     description: Marks a single notification as read and updates the readAt timestamp
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.patch('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const success = await markNotificationAsRead(notificationId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all user notifications as read
 *     description: Marks all unread notifications for the authenticated user as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           description: Number of notifications marked as read
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/{notificationId}/archive:
 *   patch:
 *     summary: Archive a notification
 *     description: Archives a notification (moves it to archived status)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.patch('/:notificationId/archive', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const success = await archiveNotification(notificationId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Notification archived'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Permanently deletes a notification from the database
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const success = await deleteNotification(notificationId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/stats/{userId}:
 *   get:
 *     summary: Get notification statistics for a user
 *     description: Retrieves comprehensive statistics about notifications for a specific user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NotificationResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationStats'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       403:
 *         description: Forbidden - Cannot access other user statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 */
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user can access these stats
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot access other user statistics'
      });
    }

    const stats = await getNotificationStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
});

export default router;
