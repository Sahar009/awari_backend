import User from './User.js';
import KycDocument from './KycDocument.js';
import Property from './Property.js';
import PropertyMedia from './PropertyMedia.js';
import Booking from './Booking.js';
import Review from './Review.js';
import Payment from './Payment.js';
import Message from './Message.js';
import Notification from './Notification.js';
import Subscription from './Subscription.js';
import Favorite from './Favorite.js';

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(KycDocument, { as: 'kycDocuments', foreignKey: 'userId' });
  User.hasMany(Property, { as: 'ownedProperties', foreignKey: 'ownerId' });
  User.hasMany(Property, { as: 'agentProperties', foreignKey: 'agentId' });
  User.hasMany(Property, { as: 'approvedProperties', foreignKey: 'approvedBy' });
  User.hasMany(Booking, { as: 'userBookings', foreignKey: 'userId' });
  User.hasMany(Booking, { as: 'ownerBookings', foreignKey: 'ownerId' });
  User.hasMany(Review, { as: 'reviews', foreignKey: 'reviewerId' });
  User.hasMany(Review, { as: 'ownerReviews', foreignKey: 'ownerId' });
  User.hasMany(Payment, { as: 'payments', foreignKey: 'userId' });
  User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
  User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });
  User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
  User.hasMany(Subscription, { as: 'subscriptions', foreignKey: 'userId' });
  User.hasMany(Favorite, { as: 'favorites', foreignKey: 'userId' });

  // KYC Document associations
  KycDocument.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  KycDocument.belongsTo(User, { as: 'verifier', foreignKey: 'verifiedBy' });

  // Property associations
  Property.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  Property.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
  Property.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });
  Property.hasMany(PropertyMedia, { as: 'media', foreignKey: 'propertyId' });
  Property.hasMany(Booking, { as: 'bookings', foreignKey: 'propertyId' });
  Property.hasMany(Review, { as: 'reviews', foreignKey: 'propertyId' });
  Property.hasMany(Payment, { as: 'payments', foreignKey: 'propertyId' });
  Property.hasMany(Favorite, { as: 'favorites', foreignKey: 'propertyId' });

  // Property Media associations
  PropertyMedia.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });

  // Booking associations
  Booking.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Booking.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Booking.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  Booking.hasMany(Payment, { as: 'payments', foreignKey: 'bookingId' });
  Booking.hasMany(Review, { as: 'reviews', foreignKey: 'bookingId' });

  // Review associations
  Review.belongsTo(User, { as: 'reviewer', foreignKey: 'reviewerId' });
  Review.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  Review.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Review.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });
  Review.belongsTo(User, { as: 'moderator', foreignKey: 'moderatedBy' });

  // Payment associations
  Payment.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Payment.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Payment.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });
  Payment.belongsTo(User, { as: 'refunder', foreignKey: 'refundedBy' });

  // Message associations
  Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
  Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
  Message.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Message.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });
  Message.belongsTo(Message, { as: 'parent', foreignKey: 'parentMessageId' });
  Message.hasMany(Message, { as: 'replies', foreignKey: 'parentMessageId' });

  // Notification associations
  Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Notification.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Notification.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });
  Notification.belongsTo(Payment, { as: 'payment', foreignKey: 'paymentId' });

  // Subscription associations
  Subscription.belongsTo(User, { as: 'user', foreignKey: 'userId' });

  // Favorite associations
  Favorite.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Favorite.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
};

// Initialize associations
defineAssociations();

export {
  User,
  KycDocument,
  Property,
  PropertyMedia,
  Booking,
  Review,
  Payment,
  Message,
  Notification,
  Subscription,
  Favorite
};

export default {
  User,
  KycDocument,
  Property,
  PropertyMedia,
  Booking,
  Review,
  Payment,
  Message,
  Notification,
  Subscription,
  Favorite
};
