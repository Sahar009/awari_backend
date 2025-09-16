export const NotificationTypes = {
    // User related
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    PASSWORD_CHANGED: 'password_changed',
    PROFILE_UPDATED: 'profile_updated',
    ACCOUNT_VERIFIED: 'account_verified',
    
    // Property related
    PROPERTY_CREATED: 'property_created',
    PROPERTY_APPROVED: 'property_approved',
    PROPERTY_REJECTED: 'property_rejected',
    PROPERTY_UPDATED: 'property_updated',
    PROPERTY_FEATURED: 'property_featured',
    PROPERTY_VIEWED: 'property_viewed',
    PROPERTY_FAVORITED: 'property_favorited',
    
    // Booking related
    BOOKING_CREATED: 'booking_created',
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_CANCELLED: 'booking_cancelled',
    BOOKING_REJECTED: 'booking_rejected',
    BOOKING_COMPLETED: 'booking_completed',
    BOOKING_REMINDER: 'booking_reminder',
    BOOKING_CHECKIN_REMINDER: 'booking_checkin_reminder',
    BOOKING_CHECKOUT_REMINDER: 'booking_checkout_reminder',
    
    // Payment related
    PAYMENT_PENDING: 'payment_pending',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_REFUNDED: 'payment_refunded',
    PAYMENT_REMINDER: 'payment_reminder',
    
    // Message related
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_REPLY: 'message_reply',
    
    // System related
    SYSTEM_MAINTENANCE: 'system_maintenance',
    SYSTEM_UPDATE: 'system_update',
    SECURITY_ALERT: 'security_alert',
    
    // Availability related
    AVAILABILITY_BLOCKED: 'availability_blocked',
    AVAILABILITY_UNBLOCKED: 'availability_unblocked',
    
    // Review related
    REVIEW_RECEIVED: 'review_received',
    REVIEW_RESPONSE: 'review_response',
    
    // KYC related
    KYC_SUBMITTED: 'kyc_submitted',
    KYC_APPROVED: 'kyc_approved',
    KYC_REJECTED: 'kyc_rejected',
    
    // Newsletter related
    NEWSLETTER_SUBSCRIBED: 'newsletter_subscribed',
    NEWSLETTER_UNSUBSCRIBED: 'newsletter_unsubscribed'
};

export const NotificationTopics = {
    ALL_USERS: 'all_users',
    PROPERTY_OWNERS: 'property_owners',
    PROPERTY_AGENTS: 'property_agents',
    GUESTS: 'guests',
    ADMIN: 'admin',
    SUPPORT: 'support',
    BOOKING_UPDATES: 'booking_updates',
    PROPERTY_UPDATES: 'property_updates',
    PAYMENT_UPDATES: 'payment_updates',
    SYSTEM_ALERTS: 'system_alerts'
};

export const NotificationPriority = {
    URGENT: 'urgent',
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low'
};

export const NotificationCategories = {
    BOOKING: 'booking',
    PAYMENT: 'payment',
    PROPERTY: 'property',
    MESSAGE: 'message',
    SYSTEM: 'system',
    REMINDER: 'reminder'
};

export const NotificationChannels = {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app'
};

export const NotificationStatus = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    FAILED: 'failed',
    READ: 'read',
    UNREAD: 'unread',
    ARCHIVED: 'archived'
}; 