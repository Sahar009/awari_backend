# Notification System Documentation

This document explains the comprehensive notification system implemented for the AWARI platform, including reusable functions, templates, and integration with existing services.

## Overview

The notification system provides:
- **Multi-channel delivery** (Email, SMS, Push, In-app)
- **Template-based notifications** for common scenarios
- **Reusable service functions** for easy integration
- **Comprehensive API endpoints** for frontend integration
- **Automatic notifications** for key platform events

## Architecture

### Components

1. **Notification Schema** - Database model for storing notifications
2. **Notification Service** - Core business logic and reusable functions
3. **Delivery Channels** - Email, SMS, Push notification services
4. **Templates** - Predefined notification templates
5. **API Endpoints** - RESTful API for notification management
6. **Service Integration** - Automatic notifications in existing services

## Database Schema

### Notification Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT UUIDV4(),
  userId UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error', 'reminder', 'announcement') DEFAULT 'info',
  category ENUM('booking', 'payment', 'property', 'message', 'system', 'reminder') DEFAULT 'system',
  status ENUM('unread', 'read', 'archived') DEFAULT 'unread',
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP NULL,
  scheduledAt TIMESTAMP NULL,
  expiresAt TIMESTAMP NULL,
  actionUrl VARCHAR(500) NULL,
  actionText VARCHAR(100) NULL,
  propertyId UUID NULL REFERENCES properties(id),
  bookingId UUID NULL REFERENCES bookings(id),
  paymentId UUID NULL REFERENCES payments(id),
  channels JSON NOT NULL, -- ['email', 'sms', 'push', 'in_app']
  emailSent BOOLEAN DEFAULT FALSE,
  smsSent BOOLEAN DEFAULT FALSE,
  pushSent BOOLEAN DEFAULT FALSE,
  data JSON NULL,
  metadata JSON NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Core Service Functions

### 1. Create Notification

```javascript
import { createNotification } from '../services/notificationService.js';

const notification = await createNotification({
  userId: 'user-uuid',
  title: 'Welcome to AWARI!',
  message: 'Thank you for joining our platform.',
  type: 'success',
  category: 'system',
  priority: 'normal',
  channels: ['email', 'in_app'],
  actionUrl: '/dashboard',
  actionText: 'Get Started'
});
```

### 2. Send Notification

```javascript
import { sendNotification } from '../services/notificationService.js';

const results = await sendNotification(notificationId, ['email', 'push']);
```

### 3. Create and Send (One-step)

```javascript
import { createAndSendNotification } from '../services/notificationService.js';

const result = await createAndSendNotification({
  userId: 'user-uuid',
  title: 'Booking Confirmed!',
  message: 'Your booking has been confirmed.',
  channels: ['email', 'push', 'in_app']
});
```

### 4. Template Notifications

```javascript
import { sendTemplateNotification } from '../services/notificationService.js';

// Send welcome notification
await sendTemplateNotification('WELCOME', user);

// Send booking confirmation with additional data
await sendTemplateNotification('BOOKING_CONFIRMED', user, {
  booking: bookingData,
  property: propertyData
});
```

### 5. Bulk Notifications

```javascript
import { sendBulkNotifications } from '../services/notificationService.js';

const results = await sendBulkNotifications(
  ['user1-uuid', 'user2-uuid', 'user3-uuid'],
  {
    title: 'System Maintenance',
    message: 'Scheduled maintenance tonight at 2 AM.',
    category: 'system',
    priority: 'normal'
  }
);
```

### 6. Topic-based Notifications

```javascript
import { sendNotificationByTopic } from '../services/notificationService.js';

// Send to all property owners
await sendNotificationByTopic('property_owners', {
  title: 'New Feature Available',
  message: 'Check out our new property analytics dashboard.',
  channels: ['email', 'in_app']
});
```

## Predefined Templates

### Available Templates

1. **WELCOME** - New user welcome
2. **EMAIL_VERIFICATION** - Email verification
3. **PASSWORD_RESET** - Password reset
4. **BOOKING_CONFIRMED** - Booking confirmation
5. **BOOKING_CANCELLED** - Booking cancellation
6. **PROPERTY_APPROVED** - Property approval
7. **PROPERTY_REJECTED** - Property rejection
8. **PAYMENT_SUCCESS** - Payment success
9. **PAYMENT_FAILED** - Payment failure

### Template Usage

```javascript
// Welcome new user
await sendTemplateNotification('WELCOME', user);

// Booking confirmation with context
await sendTemplateNotification('BOOKING_CONFIRMED', user, {
  booking: {
    id: 'booking-uuid',
    checkInDate: '2024-01-15',
    checkOutDate: '2024-01-18'
  },
  property: {
    id: 'property-uuid',
    title: 'Beautiful Apartment',
    address: '123 Main St'
  }
});
```

## API Endpoints

### 1. Create Notification
**POST** `/api/notifications`

```json
{
  "userId": "user-uuid",
  "title": "Notification Title",
  "message": "Notification message",
  "type": "info",
  "category": "system",
  "priority": "normal",
  "channels": ["email", "in_app"],
  "actionUrl": "/dashboard",
  "actionText": "View Details"
}
```

### 2. Send Template Notification
**POST** `/api/notifications/template`

```json
{
  "templateName": "WELCOME",
  "userId": "user-uuid",
  "additionalData": {
    "property": { "id": "property-uuid", "title": "Property Title" }
  }
}
```

### 3. Get User Notifications
**GET** `/api/notifications/user/{userId}?page=1&limit=20&status=unread&category=booking`

### 4. Mark as Read
**PATCH** `/api/notifications/{notificationId}/read`

### 5. Mark All as Read
**PATCH** `/api/notifications/read-all`

### 6. Archive Notification
**PATCH** `/api/notifications/{notificationId}/archive`

### 7. Delete Notification
**DELETE** `/api/notifications/{notificationId}`

### 8. Get Statistics
**GET** `/api/notifications/stats/{userId}`

## Delivery Channels

### 1. Email Notifications

Uses EJS templates for rich HTML emails:

```javascript
// Email template structure
modules/views/
├── welcome.ejs
├── booking-confirmed.ejs
├── booking-cancelled.ejs
├── property-approved.ejs
├── property-rejected.ejs
├── payment-success.ejs
└── payment-failed.ejs
```

### 2. SMS Notifications

Placeholder service ready for integration:

```javascript
// SMS service (modules/notifications/sms.js)
export const sendSMS = async (phoneNumber, message) => {
  // Integrate with SMS providers like:
  // - Twilio
  // - AWS SNS
  // - Africa's Talking
};
```

### 3. Push Notifications

Firebase Cloud Messaging integration:

```javascript
// Push notification service
import { pushNotificationService } from '../modules/notifications/push.js';

await pushNotificationService.sendToDevice(token, {
  title: 'Notification Title',
  body: 'Notification message',
  data: { notificationId: 'uuid' }
});
```

### 4. In-App Notifications

Stored in database and retrieved via API.

## Service Integration

### Automatic Notifications

The system automatically sends notifications for:

1. **User Registration** - Welcome notification
2. **Booking Confirmation** - Guest notification
3. **Booking Cancellation** - Guest notification
4. **Property Approval** - Owner notification
5. **Property Rejection** - Owner notification

### Integration Examples

#### Auth Service Integration

```javascript
// In authService.js
import { sendTemplateNotification } from './notificationService.js';

// After user registration
await sendTemplateNotification('WELCOME', user);
```

#### Booking Service Integration

```javascript
// In bookingService.js
import { sendTemplateNotification } from './notificationService.js';

// After booking confirmation
await sendTemplateNotification('BOOKING_CONFIRMED', guest, {
  booking: updatedBooking,
  property: updatedBooking.property
});
```

#### Property Service Integration

```javascript
// In propertyService.js
import { sendTemplateNotification } from './notificationService.js';

// After property approval
await sendTemplateNotification('PROPERTY_APPROVED', owner, {
  property: updatedProperty
});
```

## Frontend Integration

### React Example

```jsx
import React, { useState, useEffect } from 'react';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/user/current-user-id');
      const data = await response.json();
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.notifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="notification-center">
      <h3>Notifications ({unreadCount} unread)</h3>
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`notification ${notification.isRead ? 'read' : 'unread'}`}
          onClick={() => markAsRead(notification.id)}
        >
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          {notification.actionUrl && (
            <a href={notification.actionUrl}>{notification.actionText}</a>
          )}
        </div>
      ))}
    </div>
  );
};
```

### Real-time Updates (WebSocket)

```javascript
// WebSocket integration for real-time notifications
const socket = io('ws://localhost:3000');

socket.on('notification', (notification) => {
  // Add notification to UI
  addNotificationToUI(notification);
  // Update unread count
  updateUnreadCount();
});

socket.on('notificationRead', (notificationId) => {
  // Mark notification as read in UI
  markNotificationAsReadInUI(notificationId);
});
```

## Configuration

### Environment Variables

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Firebase Configuration (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=your-client-cert-url
FIREBASE_UNIVERSE_DOMAIN=googleapis.com

# SMS Configuration (when implemented)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number
```

## Best Practices

### 1. Error Handling

Always wrap notification sending in try-catch blocks:

```javascript
try {
  await sendTemplateNotification('WELCOME', user);
} catch (error) {
  console.error('Notification failed:', error);
  // Don't fail the main operation
}
```

### 2. Performance

- Use bulk notifications for multiple users
- Implement rate limiting for SMS/email
- Cache frequently used templates
- Use background jobs for non-critical notifications

### 3. User Experience

- Provide clear action buttons
- Include relevant context data
- Allow users to customize notification preferences
- Implement notification grouping

### 4. Security

- Validate all input data
- Sanitize HTML content
- Implement proper authentication
- Rate limit notification endpoints

## Monitoring and Analytics

### Key Metrics

1. **Delivery Rates** - Email, SMS, Push success rates
2. **Read Rates** - In-app notification engagement
3. **Click-through Rates** - Action button usage
4. **User Preferences** - Channel preferences by user
5. **Error Rates** - Failed delivery tracking

### Logging

```javascript
// Log notification events
console.log('Notification sent:', {
  userId: user.id,
  type: notification.type,
  channels: notification.channels,
  timestamp: new Date()
});
```

## Troubleshooting

### Common Issues

1. **Email not sending** - Check SMTP configuration
2. **Push notifications not working** - Verify Firebase setup
3. **SMS not delivered** - Check phone number format
4. **Templates not rendering** - Verify EJS template syntax

### Debug Mode

Enable debug logging:

```javascript
// In notification service
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Sending notification:', notificationData);
}
```

## Future Enhancements

1. **Advanced Templates** - Dynamic template generation
2. **A/B Testing** - Test different notification formats
3. **Scheduling** - Advanced scheduling options
4. **Analytics Dashboard** - Real-time notification metrics
5. **User Preferences** - Granular notification settings
6. **Multi-language Support** - Localized notifications
7. **Rich Media** - Images and attachments in notifications
8. **Webhook Integration** - External system notifications
