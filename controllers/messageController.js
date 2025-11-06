import messageService from '../services/messageService.js';
import { validationResult } from 'express-validator';

class MessageController {
  /**
   * Send a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await messageService.sendMessage(
        req.body,
        req.user.id
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Send message error:', error);
      
      if (error.message === 'Receiver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot send message to yourself') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get messages for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMessages(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        status: req.query.status,
        isImportant: req.query.isImportant,
        isSpam: req.query.isSpam,
        propertyId: req.query.propertyId,
        bookingId: req.query.bookingId,
        threadId: req.query.threadId,
        type: req.query.type || 'received'
      };

      const result = await messageService.getMessages(req.user.id, filters);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get messages',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get conversation between two users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const filters = {
        page: req.query.page || 1,
        limit: req.query.limit || 50,
        propertyId: req.query.propertyId,
        bookingId: req.query.bookingId
      };

      const result = await messageService.getConversation(
        req.user.id,
        req.params.userId,
        filters
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all conversations for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConversations(req, res) {
    try {
      const result = await messageService.getConversations(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get a single message by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMessageById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await messageService.getMessageById(
        req.params.messageId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Get message error:', error);
      
      if (error.message === 'Message not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to view this message') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to get message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark messages as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markAsRead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const messageIds = req.body.messageIds || [];
      const result = await messageService.markAsRead(messageIds, req.user.id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Mark conversation as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markConversationAsRead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await messageService.markConversationAsRead(
        req.params.userId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Mark conversation as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark conversation as read',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await messageService.updateMessage(
        req.params.messageId,
        req.body,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Update message error:', error);
      
      if (error.message === 'Message not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to update this message') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete a message
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const result = await messageService.deleteMessage(
        req.params.messageId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Delete message error:', error);
      
      if (error.message === 'Message not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Unauthorized to delete this message') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get unread message count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUnreadCount(req, res) {
    try {
      const result = await messageService.getUnreadCount(req.user.id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get unread count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new MessageController();

