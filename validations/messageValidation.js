import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating a message
 */
export const createMessageValidation = [
  body('receiverId')
    .isUUID()
    .withMessage('Receiver ID must be a valid UUID'),
  
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  
  body('propertyId')
    .optional()
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  
  body('bookingId')
    .optional()
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Message type must be one of: text, image, file, system'),
  
  body('parentMessageId')
    .optional()
    .isUUID()
    .withMessage('Parent message ID must be a valid UUID'),
  
  body('threadId')
    .optional()
    .isUUID()
    .withMessage('Thread ID must be a valid UUID'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  
  body('attachments.*.url')
    .optional()
    .isURL()
    .withMessage('Attachment URL must be a valid URL'),
  
  body('attachments.*.filename')
    .optional()
    .isString()
    .withMessage('Attachment filename must be a string')
];

/**
 * Validation rules for updating a message
 */
export const updateMessageValidation = [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['sent', 'delivered', 'read', 'archived'])
    .withMessage('Status must be one of: sent, delivered, read, archived'),
  
  body('isImportant')
    .optional()
    .isBoolean()
    .withMessage('isImportant must be a boolean'),
  
  body('isSpam')
    .optional()
    .isBoolean()
    .withMessage('isSpam must be a boolean')
];

/**
 * Validation rules for message ID parameter
 */
export const messageIdValidation = [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID')
];

/**
 * Validation rules for getting messages
 */
export const getMessagesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['sent', 'delivered', 'read', 'archived'])
    .withMessage('Invalid status filter'),
  
  query('isImportant')
    .optional()
    .isBoolean()
    .withMessage('isImportant filter must be a boolean'),
  
  query('isSpam')
    .optional()
    .isBoolean()
    .withMessage('isSpam filter must be a boolean'),
  
  query('propertyId')
    .optional()
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  
  query('bookingId')
    .optional()
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
  
  query('threadId')
    .optional()
    .isUUID()
    .withMessage('Thread ID must be a valid UUID')
];

/**
 * Validation rules for getting conversation
 */
export const getConversationValidation = [
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('propertyId')
    .optional()
    .isUUID()
    .withMessage('Property ID must be a valid UUID'),
  
  query('bookingId')
    .optional()
    .isUUID()
    .withMessage('Booking ID must be a valid UUID')
];

/**
 * Validation rules for marking messages as read
 */
export const markAsReadValidation = [
  body('messageIds')
    .optional()
    .isArray()
    .withMessage('Message IDs must be an array'),
  
  body('messageIds.*')
    .isUUID()
    .withMessage('Each message ID must be a valid UUID'),
  
  param('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

/**
 * Validation rules for deleting messages
 */
export const deleteMessageValidation = [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID')
];


