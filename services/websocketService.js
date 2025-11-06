import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../schema/index.js';
import messageService from './messageService.js';

/**
 * WebSocket Service for Real-time Messaging
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId[]
  }

  /**
   * Initialize Socket.io server
   * @param {Object} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware for Socket.io
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['passwordHash'] },
          paranoid: true
        });

        if (!user || user.status !== 'active') {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket server initialized');
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      console.log(`🔌 User connected: ${userId} (Socket: ${socket.id})`);

      // Add user to connected users map
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, []);
      }
      this.connectedUsers.get(userId).push(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Notify user that they're connected
      socket.emit('connected', {
        success: true,
        message: 'Connected to messaging service',
        userId
      });

      // Send unread count on connection
      this.sendUnreadCount(userId);

      /**
       * Handle sending a message
       */
      socket.on('send_message', async (data) => {
        try {
          const { receiverId, content, subject, propertyId, bookingId, messageType, attachments } = data;

          if (!receiverId || !content) {
            socket.emit('error', {
              message: 'Receiver ID and content are required'
            });
            return;
          }

          // Send message using service
          const result = await messageService.sendMessage(
            {
              receiverId,
              content,
              subject,
              propertyId,
              bookingId,
              messageType: messageType || 'text',
              attachments,
              ipAddress: socket.handshake.address,
              userAgent: socket.handshake.headers['user-agent']
            },
            userId
          );

          if (result.success) {
            const message = result.data;

            // Emit to sender (confirmation)
            socket.emit('message_sent', {
              success: true,
              message: 'Message sent successfully',
              data: message
            });

            // Emit to receiver if online
            this.io.to(`user:${receiverId}`).emit('new_message', {
              success: true,
              data: message
            });

            // Update unread count for receiver
            this.sendUnreadCount(receiverId);

            // If conversation room exists, emit there too
            const conversationRoom = this.getConversationRoom(userId, receiverId);
            this.io.to(conversationRoom).emit('message_received', {
              success: true,
              data: message
            });
          }
        } catch (error) {
          console.error('Error sending message via WebSocket:', error);
          socket.emit('error', {
            message: 'Failed to send message',
            error: error.message
          });
        }
      });

      /**
       * Handle joining a conversation room
       */
      socket.on('join_conversation', async (data) => {
        try {
          const { otherUserId, propertyId, bookingId } = data;

          if (!otherUserId) {
            socket.emit('error', {
              message: 'Other user ID is required'
            });
            return;
          }

          // Validate that user can access this conversation
          if (otherUserId === userId) {
            socket.emit('error', {
              message: 'Cannot join conversation with yourself'
            });
            return;
          }

          const conversationRoom = this.getConversationRoom(userId, otherUserId);
          socket.join(conversationRoom);

          // Load conversation messages
          const conversation = await messageService.getConversation(
            userId,
            otherUserId,
            { propertyId, bookingId, limit: 50 }
          );

          socket.emit('conversation_joined', {
            success: true,
            room: conversationRoom,
            data: conversation.data
          });

          // Mark conversation as read
          await messageService.markConversationAsRead(otherUserId, userId);
          this.sendUnreadCount(userId);
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', {
            message: 'Failed to join conversation',
            error: error.message
          });
        }
      });

      /**
       * Handle leaving a conversation room
       */
      socket.on('leave_conversation', (data) => {
        const { otherUserId } = data;
        if (otherUserId) {
          const conversationRoom = this.getConversationRoom(userId, otherUserId);
          socket.leave(conversationRoom);
          socket.emit('conversation_left', {
            success: true,
            room: conversationRoom
          });
        }
      });

      /**
       * Handle marking messages as read
       */
      socket.on('mark_read', async (data) => {
        try {
          const { messageIds, senderId } = data;

          if (messageIds && Array.isArray(messageIds)) {
            await messageService.markAsRead(messageIds, userId);
          } else if (senderId) {
            await messageService.markConversationAsRead(senderId, userId);
          }

          this.sendUnreadCount(userId);

          // Notify sender that messages were read
          if (senderId) {
            this.io.to(`user:${senderId}`).emit('messages_read', {
              userId,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Error marking messages as read:', error);
          socket.emit('error', {
            message: 'Failed to mark messages as read',
            error: error.message
          });
        }
      });

      /**
       * Handle typing indicator
       */
      socket.on('typing', (data) => {
        const { receiverId, isTyping } = data;
        if (receiverId && receiverId !== userId) {
          this.io.to(`user:${receiverId}`).emit('user_typing', {
            userId,
            isTyping: isTyping !== false,
            timestamp: new Date()
          });
        }
      });

      /**
       * Handle getting unread count
       */
      socket.on('get_unread_count', async () => {
        this.sendUnreadCount(userId);
      });

      /**
       * Handle disconnect
       */
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${userId} (Socket: ${socket.id})`);

        // Remove socket from connected users
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          const index = userSockets.indexOf(socket.id);
          if (index > -1) {
            userSockets.splice(index, 1);
          }

          // Remove user from map if no sockets left
          if (userSockets.length === 0) {
            this.connectedUsers.delete(userId);
          }
        }

        // Notify other users in conversations that this user went offline
        this.io.emit('user_offline', { userId });
      });
    });
  }

  /**
   * Get conversation room name for two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {string} Room name
   */
  getConversationRoom(userId1, userId2) {
    // Sort IDs to ensure consistent room name
    const sortedIds = [userId1, userId2].sort();
    return `conversation:${sortedIds[0]}:${sortedIds[1]}`;
  }

  /**
   * Send unread count to a user
   * @param {string} userId - User ID
   */
  async sendUnreadCount(userId) {
    try {
      const result = await messageService.getUnreadCount(userId);
      this.io.to(`user:${userId}`).emit('unread_count', result.data);
    } catch (error) {
      console.error('Error sending unread count:', error);
    }
  }

  /**
   * Check if a user is online
   * @param {string} userId - User ID
   * @returns {boolean} Whether user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).length > 0;
  }

  /**
   * Get Socket.io instance
   * @returns {Object} Socket.io server instance
   */
  getIO() {
    return this.io;
  }
}

export default new WebSocketService();

