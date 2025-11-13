import { Message, User, Property, Booking } from '../schema/index.js';
import { Op } from 'sequelize';
import { createNotification } from './notificationService.js';

/**
 * Message Service
 * Handles all message-related business logic
 */
class MessageService {
  /**
   * Send a message
   * @param {Object} messageData - Message data
   * @param {string} senderId - Sender user ID
   * @returns {Object} Created message
   */
  async sendMessage(messageData, senderId) {
    try {
      const {
        receiverId,
        content,
        subject = null,
        propertyId = null,
        bookingId = null,
        messageType = 'text',
        parentMessageId = null,
        threadId = null,
        attachments = null,
        ipAddress = null,
        userAgent = null
      } = messageData;

      // Validate receiver exists
      const receiver = await User.findByPk(receiverId);
      if (!receiver) {
        throw new Error('Receiver not found');
      }

      // Validate sender cannot send to themselves
      if (senderId === receiverId) {
        throw new Error('Cannot send message to yourself');
      }

      // Validate property exists if provided
      if (propertyId) {
        const property = await Property.findByPk(propertyId);
        if (!property) {
          throw new Error('Property not found');
        }
      }

      // Validate booking exists if provided
      if (bookingId) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) {
          throw new Error('Booking not found');
        }
      }

      // Generate threadId if not provided and this is a new conversation
      let finalThreadId = threadId;
      if (!finalThreadId && !parentMessageId) {
        // Check if there's an existing thread between these users
        const existingThread = await Message.findOne({
          where: {
            [Op.or]: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId }
            ],
            threadId: { [Op.ne]: null }
          },
          order: [['createdAt', 'DESC']]
        });

        if (existingThread) {
          finalThreadId = existingThread.threadId;
        }
      }

      // Create message
      const message = await Message.create({
        senderId,
        receiverId,
        content,
        subject,
        propertyId,
        bookingId,
        messageType,
        parentMessageId,
        threadId: finalThreadId,
        attachments,
        status: 'sent',
        ipAddress,
        userAgent
      });

      // Update threadId if it was null and this is the first message
      if (!finalThreadId) {
        await message.update({ threadId: message.id });
      }

      // Load message with associations
      const messageWithDetails = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Property,
            as: 'property',
            attributes: ['id', 'title', 'slug'],
            required: false
          },
          {
            model: Booking,
            as: 'booking',
            attributes: ['id', 'bookingType', 'status'],
            required: false
          }
        ]
      });

      // Send notification to receiver
      try {
        await createNotification({
          userId: receiverId,
          title: 'New Message',
          message: `You have a new message from ${messageWithDetails.sender.firstName} ${messageWithDetails.sender.lastName}`,
          type: 'message',
          category: 'communication',
          priority: 'normal',
          channels: ['in_app', 'email', 'push'],
          actionUrl: `/messages/${message.id}`,
          actionText: 'View Message',
          propertyId,
          bookingId,
          data: {
            messageId: message.id,
            senderId,
            senderName: `${messageWithDetails.sender.firstName} ${messageWithDetails.sender.lastName}`
          }
        });
      } catch (notificationError) {
        console.warn('Failed to send message notification:', notificationError);
      }

      return {
        success: true,
        message: 'Message sent successfully',
        data: messageWithDetails
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a user (inbox)
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Messages with pagination
   */
  async getMessages(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        isImportant = null,
        isSpam = null,
        propertyId = null,
        bookingId = null,
        threadId = null,
        type = 'received' // 'received', 'sent', 'all'
      } = filters;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};

      if (type === 'received') {
        where.receiverId = userId;
      } else if (type === 'sent') {
        where.senderId = userId;
      } else {
        where[Op.or] = [
          { senderId: userId },
          { receiverId: userId }
        ];
      }

      if (status) {
        where.status = status;
      }

      if (isImportant !== null) {
        where.isImportant = isImportant;
      }

      if (isSpam !== null) {
        where.isSpam = isSpam;
      }

      if (propertyId) {
        where.propertyId = propertyId;
      }

      if (bookingId) {
        where.bookingId = bookingId;
      }

      if (threadId) {
        where.threadId = threadId;
      }

      const { count, rows } = await Message.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Property,
            as: 'property',
            attributes: ['id', 'title', 'slug'],
            required: false
          },
          {
            model: Booking,
            as: 'booking',
            attributes: ['id', 'bookingType', 'status'],
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
          messages: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Get conversation between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {Object} filters - Filter options
   * @returns {Object} Conversation messages
   */
  async getConversation(userId1, userId2, filters = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        propertyId = null,
        bookingId = null
      } = filters;

      const offset = (page - 1) * limit;

      const where = {
        [Op.or]: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      };

      if (propertyId) {
        where.propertyId = propertyId;
      }

      if (bookingId) {
        where.bookingId = bookingId;
      }

      const { count, rows } = await Message.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Property,
            as: 'property',
            attributes: ['id', 'title', 'slug'],
            required: false
          },
          {
            model: Booking,
            as: 'booking',
            attributes: ['id', 'bookingType', 'status'],
            required: false
          }
        ],
        order: [['createdAt', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          messages: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   * @param {string} userId - User ID
   * @returns {Object} List of conversations
   */
  async getConversations(userId) {
    try {
      // Get distinct conversations (threads)
      const messages = await Message.findAll({
        where: {
          [Op.or]: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Property,
            as: 'property',
            attributes: ['id', 'title', 'slug'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Group by threadId or create unique conversation keys
      const conversationsMap = new Map();

      messages.forEach(message => {
        const otherUserId = message.senderId === userId 
          ? message.receiverId 
          : message.senderId;
        
        const conversationKey = message.threadId || `${userId}-${otherUserId}`;
        
        if (!conversationsMap.has(conversationKey)) {
          conversationsMap.set(conversationKey, {
            threadId: message.threadId,
            otherUser: message.senderId === userId 
              ? message.receiver 
              : message.sender,
            property: message.property,
            lastMessage: message,
            unreadCount: 0,
            totalMessages: 0
          });
        }

        const conversation = conversationsMap.get(conversationKey);
        conversation.totalMessages += 1;

        // Count unread messages
        if (message.receiverId === userId && message.status !== 'read') {
          conversation.unreadCount += 1;
        }

        // Update last message if this is newer
        if (new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
          conversation.lastMessage = message;
        }
      });

      const conversations = Array.from(conversationsMap.values());

      // Sort by last message date
      conversations.sort((a, b) => 
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      );

      return {
        success: true,
        data: {
          conversations
        }
      };
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get a single message by ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Message details
   */
  async getMessageById(messageId, userId) {
    try {
      const message = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: Property,
            as: 'property',
            required: false
          },
          {
            model: Booking,
            as: 'booking',
            required: false
          },
          {
            model: Message,
            as: 'parent',
            required: false,
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
              }
            ]
          }
        ]
      });

      if (!message) {
        throw new Error('Message not found');
      }

      // Check authorization
      if (message.senderId !== userId && message.receiverId !== userId) {
        throw new Error('Unauthorized to view this message');
      }

      // Mark as read if user is the receiver
      if (message.receiverId === userId && message.status !== 'read') {
        await message.update({
          status: 'read',
          readAt: new Date()
        });
        message.status = 'read';
        message.readAt = new Date();
      }

      return {
        success: true,
        data: message
      };
    } catch (error) {
      console.error('Error getting message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   * @param {Array} messageIds - Array of message IDs
   * @param {string} userId - User ID
   * @returns {Object} Update result
   */
  async markAsRead(messageIds, userId) {
    try {
      const updated = await Message.update(
        {
          status: 'read',
          readAt: new Date()
        },
        {
          where: {
            id: { [Op.in]: messageIds },
            receiverId: userId,
            status: { [Op.ne]: 'read' }
          }
        }
      );

      return {
        success: true,
        message: `${updated[0]} message(s) marked as read`,
        data: { updatedCount: updated[0] }
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Mark all messages from a user as read
   * @param {string} senderId - Sender user ID
   * @param {string} receiverId - Receiver user ID
   * @returns {Object} Update result
   */
  async markConversationAsRead(senderId, receiverId) {
    try {
      const updated = await Message.update(
        {
          status: 'read',
          readAt: new Date()
        },
        {
          where: {
            senderId,
            receiverId,
            status: { [Op.ne]: 'read' }
          }
        }
      );

      return {
        success: true,
        message: `Conversation marked as read`,
        data: { updatedCount: updated[0] }
      };
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  /**
   * Update message
   * @param {string} messageId - Message ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Updated message
   */
  async updateMessage(messageId, updateData, userId) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Check authorization (only sender can update)
      if (message.senderId !== userId) {
        throw new Error('Unauthorized to update this message');
      }

      // Only allow updating certain fields
      const allowedFields = ['status', 'isImportant', 'isSpam'];
      const updateFields = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      await message.update(updateFields);

      const updatedMessage = await Message.findByPk(messageId, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
          }
        ]
      });

      return {
        success: true,
        message: 'Message updated successfully',
        data: updatedMessage
      };
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Object} Delete result
   */
  async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Check authorization (sender or receiver can delete)
      if (message.senderId !== userId && message.receiverId !== userId) {
        throw new Error('Unauthorized to delete this message');
      }

      await message.destroy();

      return {
        success: true,
        message: 'Message deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   * @param {string} userId - User ID
   * @returns {Object} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Message.count({
        where: {
          receiverId: userId,
          status: { [Op.ne]: 'read' }
        }
      });

      return {
        success: true,
        data: { unreadCount: count }
      };
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
}

export default new MessageService();


