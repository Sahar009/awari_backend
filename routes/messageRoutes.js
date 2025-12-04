import express from 'express';
import { validationResult } from 'express-validator';
import messageController from '../controllers/messageController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  createMessageValidation,
  updateMessageValidation,
  messageIdValidation,
  getMessagesValidation,
  getConversationValidation,
  markAsReadValidation,
  deleteMessageValidation
} from '../validations/messageValidation.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - receiverId
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Message ID
 *         senderId:
 *           type: string
 *           format: uuid
 *           description: Sender user ID
 *         receiverId:
 *           type: string
 *           format: uuid
 *           description: Receiver user ID
 *         propertyId:
 *           type: string
 *           format: uuid
 *           description: Associated property ID (optional)
 *         bookingId:
 *           type: string
 *           format: uuid
 *           description: Associated booking ID (optional)
 *         messageType:
 *           type: string
 *           enum: [text, image, file, system]
 *           default: text
 *           description: Message type
 *         subject:
 *           type: string
 *           maxLength: 200
 *           description: Message subject (optional)
 *         content:
 *           type: string
 *           description: Message content
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *           description: Message attachments
 *         status:
 *           type: string
 *           enum: [sent, delivered, read, archived]
 *           default: sent
 *           description: Message status
 *         readAt:
 *           type: string
 *           format: date-time
 *           description: Read timestamp
 *         isImportant:
 *           type: boolean
 *           default: false
 *           description: Whether message is important
 *         isSpam:
 *           type: boolean
 *           default: false
 *           description: Whether message is spam
 *         parentMessageId:
 *           type: string
 *           format: uuid
 *           description: Parent message ID for replies
 *         threadId:
 *           type: string
 *           format: uuid
 *           description: Thread ID for grouping messages
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
 * /api/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *               subject:
 *                 type: string
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file, system]
 *               parentMessageId:
 *                 type: string
 *                 format: uuid
 *               attachments:
 *                 type: array
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateToken,
  createMessageValidation,
  handleValidationErrors,
  messageController.sendMessage
);

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get messages for authenticated user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [received, sent, all]
 *         description: Message type filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, delivered, read, archived]
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  authenticateToken,
  getMessagesValidation,
  handleValidationErrors,
  messageController.getMessages
);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for authenticated user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/conversations',
  authenticateToken,
  messageController.getConversations
);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/unread-count',
  authenticateToken,
  messageController.getUnreadCount
);

/**
 * @swagger
 * /api/messages/conversation/{userId}:
 *   get:
 *     summary: Get conversation between authenticated user and another user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/conversation/:userId',
  authenticateToken,
  getConversationValidation,
  handleValidationErrors,
  messageController.getConversation
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   get:
 *     summary: Get a single message by ID
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:messageId',
  authenticateToken,
  messageIdValidation,
  handleValidationErrors,
  messageController.getMessageById
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
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
 *                 enum: [sent, delivered, read, archived]
 *               isImportant:
 *                 type: boolean
 *               isSpam:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:messageId',
  authenticateToken,
  updateMessageValidation,
  handleValidationErrors,
  messageController.updateMessage
);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:messageId',
  authenticateToken,
  deleteMessageValidation,
  handleValidationErrors,
  messageController.deleteMessage
);

/**
 * @swagger
 * /api/messages/mark-read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       500:
 *         description: Internal server error
 */
router.post(
  '/mark-read',
  authenticateToken,
  markAsReadValidation,
  handleValidationErrors,
  messageController.markAsRead
);

/**
 * @swagger
 * /api/messages/conversation/{userId}/mark-read:
 *   post:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation marked as read
 *       500:
 *         description: Internal server error
 */
router.post(
  '/conversation/:userId/mark-read',
  authenticateToken,
  getConversationValidation,
  handleValidationErrors,
  messageController.markConversationAsRead
);

export default router;


