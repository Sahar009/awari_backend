# Messaging System Documentation

## Overview

The messaging system provides real-time chat functionality between users, landlords, and agents. It supports both REST API endpoints and WebSocket connections for instant messaging.

## Features

- ✅ Real-time messaging via WebSocket
- ✅ REST API for message management
- ✅ Conversation threading
- ✅ Message status tracking (sent, delivered, read)
- ✅ Typing indicators
- ✅ Unread message count
- ✅ Message attachments support
- ✅ Property and booking context linking
- ✅ Notification integration

## API Endpoints

### REST API

All endpoints require authentication via JWT token in the Authorization header.

#### Send Message
```
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverId": "uuid",
  "content": "Message content",
  "subject": "Optional subject",
  "propertyId": "uuid (optional)",
  "bookingId": "uuid (optional)",
  "messageType": "text|image|file|system",
  "attachments": []
}
```

#### Get Messages
```
GET /api/messages?page=1&limit=20&type=received&status=read
Authorization: Bearer <token>
```

Query Parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `type` - Message type: `received`, `sent`, or `all` (default: `received`)
- `status` - Filter by status: `sent`, `delivered`, `read`, `archived`
- `isImportant` - Filter important messages (boolean)
- `isSpam` - Filter spam messages (boolean)
- `propertyId` - Filter by property (UUID)
- `bookingId` - Filter by booking (UUID)
- `threadId` - Filter by thread (UUID)

#### Get Conversations
```
GET /api/messages/conversations
Authorization: Bearer <token>
```

Returns a list of all conversations with the last message and unread count.

#### Get Conversation
```
GET /api/messages/conversation/:userId?page=1&limit=50&propertyId=uuid&bookingId=uuid
Authorization: Bearer <token>
```

Get messages between authenticated user and another user.

#### Get Message by ID
```
GET /api/messages/:messageId
Authorization: Bearer <token>
```

Automatically marks the message as read if the user is the receiver.

#### Update Message
```
PUT /api/messages/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "read|archived",
  "isImportant": true,
  "isSpam": false
}
```

#### Delete Message
```
DELETE /api/messages/:messageId
Authorization: Bearer <token>
```

#### Mark Messages as Read
```
POST /api/messages/mark-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageIds": ["uuid1", "uuid2"]
}
```

#### Mark Conversation as Read
```
POST /api/messages/conversation/:userId/mark-read
Authorization: Bearer <token>
```

#### Get Unread Count
```
GET /api/messages/unread-count
Authorization: Bearer <token>
```

## WebSocket API

### Connection

Connect to the WebSocket server using Socket.io client:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8000', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling']
});
```

### Events

#### Client → Server Events

**`send_message`**
Send a new message in real-time:
```javascript
socket.emit('send_message', {
  receiverId: 'uuid',
  content: 'Hello!',
  subject: 'Optional subject',
  propertyId: 'uuid (optional)',
  bookingId: 'uuid (optional)',
  messageType: 'text',
  attachments: []
});
```

**`join_conversation`**
Join a conversation room to receive real-time updates:
```javascript
socket.emit('join_conversation', {
  otherUserId: 'uuid',
  propertyId: 'uuid (optional)',
  bookingId: 'uuid (optional)'
});
```

**`leave_conversation`**
Leave a conversation room:
```javascript
socket.emit('leave_conversation', {
  otherUserId: 'uuid'
});
```

**`mark_read`**
Mark messages as read:
```javascript
socket.emit('mark_read', {
  messageIds: ['uuid1', 'uuid2'] // Optional: specific messages
  // OR
  senderId: 'uuid' // Mark all messages from a sender as read
});
```

**`typing`**
Send typing indicator:
```javascript
socket.emit('typing', {
  receiverId: 'uuid',
  isTyping: true // or false to stop
});
```

**`get_unread_count`**
Request unread message count:
```javascript
socket.emit('get_unread_count');
```

#### Server → Client Events

**`connected`**
Emitted when client successfully connects:
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { success: true, message: 'Connected to messaging service', userId: 'uuid' }
});
```

**`message_sent`**
Confirmation that message was sent:
```javascript
socket.on('message_sent', (data) => {
  console.log('Message sent:', data);
  // { success: true, message: 'Message sent successfully', data: {...} }
});
```

**`new_message`**
New message received:
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // { success: true, data: { message object } }
});
```

**`message_received`**
Message received in conversation room:
```javascript
socket.on('message_received', (data) => {
  console.log('Message in conversation:', data);
});
```

**`conversation_joined`**
Successfully joined a conversation:
```javascript
socket.on('conversation_joined', (data) => {
  console.log('Joined conversation:', data);
  // { success: true, room: 'conversation:uuid1:uuid2', data: { messages: [...] } }
});
```

**`conversation_left`**
Left a conversation:
```javascript
socket.on('conversation_left', (data) => {
  console.log('Left conversation:', data);
});
```

**`messages_read`**
Notification that messages were read by receiver:
```javascript
socket.on('messages_read', (data) => {
  console.log('Messages read by:', data.userId);
});
```

**`user_typing`**
User typing indicator:
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // { userId: 'uuid', isTyping: true, timestamp: Date }
});
```

**`unread_count`**
Unread message count update:
```javascript
socket.on('unread_count', (data) => {
  console.log('Unread count:', data.unreadCount);
});
```

**`user_offline`**
User went offline:
```javascript
socket.on('user_offline', (data) => {
  console.log('User offline:', data.userId);
});
```

**`error`**
Error occurred:
```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

## Frontend Integration Example

### React/Next.js Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useMessaging = (token: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('http://localhost:8000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connected', () => {
      console.log('Connected to messaging');
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.data]);
    });

    newSocket.on('message_received', (data) => {
      setMessages(prev => [...prev, data.data]);
    });

    newSocket.on('unread_count', (data) => {
      setUnreadCount(data.unreadCount);
    });

    newSocket.on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const sendMessage = (receiverId: string, content: string) => {
    if (socket) {
      socket.emit('send_message', {
        receiverId,
        content
      });
    }
  };

  const joinConversation = (otherUserId: string) => {
    if (socket) {
      socket.emit('join_conversation', { otherUserId });
    }
  };

  const markAsRead = (messageIds?: string[], senderId?: string) => {
    if (socket) {
      socket.emit('mark_read', { messageIds, senderId });
    }
  };

  return {
    socket,
    messages,
    unreadCount,
    isTyping,
    sendMessage,
    joinConversation,
    markAsRead
  };
};
```

## Database Schema

The `Message` model includes:
- `id` - UUID primary key
- `senderId` - Sender user ID
- `receiverId` - Receiver user ID
- `propertyId` - Optional property context
- `bookingId` - Optional booking context
- `messageType` - text, image, file, system
- `subject` - Optional message subject
- `content` - Message content
- `attachments` - JSON array of attachments
- `status` - sent, delivered, read, archived
- `readAt` - Timestamp when read
- `isImportant` - Boolean flag
- `isSpam` - Boolean flag
- `parentMessageId` - For replies
- `threadId` - For conversation grouping
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

## Security

- All endpoints require JWT authentication
- WebSocket connections require JWT token in auth
- Users can only view messages they sent or received
- Message validation prevents sending to yourself
- IP address and user agent tracking for security

## Notifications

When a message is sent:
- In-app notification is created
- Email notification is sent (if configured)
- Push notification is sent (if configured)
- Real-time WebSocket event is emitted

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Validation errors if any
}
```

## Testing

Test the messaging system using:
1. REST API via Postman/Swagger
2. WebSocket via Socket.io client
3. Frontend integration with React/Next.js

## Future Enhancements

- [ ] Message search functionality
- [ ] Message forwarding
- [ ] Message reactions/emojis
- [ ] Voice messages
- [ ] Video messages
- [ ] Message encryption
- [ ] Message scheduling
- [ ] Message templates


