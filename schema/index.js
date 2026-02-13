import User from './User.js';
import KycDocument from './KycDocument.js';
import Property from './Property.js';
import PropertyMedia from './PropertyMedia.js';
import PropertyAvailability from './PropertyAvailability.js';
import Booking from './Booking.js';
import Review from './Review.js';
import Payment from './Payment.js';
import Message from './Message.js';
import Notification from './Notification.js';
import Subscription from './Subscription.js';
import SubscriptionPlan from './SubscriptionPlan.js';
import NewsletterSubscription from './NewsletterSubscription.js';
import Favorite from './Favorite.js';
import Wallet from './Wallet.js';
import WalletTransaction from './WalletTransaction.js';
import BookingFeeConfig from './BookingFeeConfig.js';
import BookingConfig from './BookingConfig.js';

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(KycDocument, { as: 'kycDocuments', foreignKey: 'userId' });
  User.hasMany(Property, { as: 'ownedProperties', foreignKey: 'ownerId' });
  User.hasMany(Property, { as: 'agentProperties', foreignKey: 'agentId' });
  User.hasMany(Property, { as: 'approvedProperties', foreignKey: 'approvedBy' });
  User.hasMany(Booking, { as: 'userBookings', foreignKey: 'userId' });
  User.hasMany(Booking, { as: 'ownerBookings', foreignKey: 'ownerId' });
  User.hasMany(Booking, { as: 'cancelledBookings', foreignKey: 'cancelledBy' });
  User.hasMany(Review, { as: 'reviews', foreignKey: 'reviewerId' });
  User.hasMany(Review, { as: 'ownerReviews', foreignKey: 'ownerId' });
  User.hasMany(Payment, { as: 'payments', foreignKey: 'userId' });
  User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
  User.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });
  User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
  User.hasMany(Subscription, { as: 'subscriptions', foreignKey: 'userId' });
  User.hasMany(Favorite, { as: 'favorites', foreignKey: 'userId' });
  User.hasOne(Wallet, { as: 'wallet', foreignKey: 'userId' });
  User.hasMany(WalletTransaction, { as: 'walletTransactions', foreignKey: 'userId' });

  // KYC Document associations
  KycDocument.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  KycDocument.belongsTo(User, { as: 'verifier', foreignKey: 'verifiedBy' });

  // Property associations
  Property.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  Property.belongsTo(User, { as: 'agent', foreignKey: 'agentId' });
  Property.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });
  Property.hasMany(PropertyMedia, { as: 'media', foreignKey: 'propertyId' });
  Property.hasMany(PropertyAvailability, { as: 'availability', foreignKey: 'propertyId' });
  Property.hasMany(Booking, { as: 'bookings', foreignKey: 'propertyId' });
  Property.hasMany(Review, { as: 'reviews', foreignKey: 'propertyId' });
  Property.hasMany(Payment, { as: 'payments', foreignKey: 'propertyId' });
  Property.hasMany(Favorite, { as: 'favorites', foreignKey: 'propertyId' });

  // Property Media associations
  PropertyMedia.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });

  // Property Availability associations
  PropertyAvailability.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  PropertyAvailability.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });
  PropertyAvailability.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

  // Booking associations
  Booking.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });
  Booking.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Booking.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
  Booking.belongsTo(User, { as: 'cancelledByUser', foreignKey: 'cancelledBy' });
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
  Subscription.belongsTo(SubscriptionPlan, { as: 'plan', foreignKey: 'planId' });
  // Note: Payment.propertyId is used to store subscriptionId for subscription payments

  SubscriptionPlan.hasMany(Subscription, { as: 'subscriptions', foreignKey: 'planId' });
  SubscriptionPlan.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
  SubscriptionPlan.belongsTo(User, { as: 'updater', foreignKey: 'updatedBy' });

  // Favorite associations
  Favorite.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Favorite.belongsTo(Property, { as: 'property', foreignKey: 'propertyId' });

  // Wallet associations
  Wallet.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  Wallet.hasMany(WalletTransaction, { as: 'transactions', foreignKey: 'walletId' });

  // WalletTransaction associations
  WalletTransaction.belongsTo(User, { as: 'user', foreignKey: 'userId' });
  WalletTransaction.belongsTo(Wallet, { as: 'wallet', foreignKey: 'walletId' });
};

// Initialize associations
defineAssociations();

export {
  User,
  KycDocument,
  Property,
  PropertyMedia,
  PropertyAvailability,
  Booking,
  Review,
  Payment,
  Message,
  Notification,
  Subscription,
  SubscriptionPlan,
  NewsletterSubscription,
  Favorite,
  Wallet,
  WalletTransaction,
  BookingFeeConfig,
  BookingConfig
};

export default {
  User,
  KycDocument,
  Property,
  PropertyMedia,
  PropertyAvailability,
  Booking,
  Review,
  Payment,
  Message,
  Notification,
  Subscription,
  SubscriptionPlan,
  NewsletterSubscription,
  Favorite,
  Wallet,
  WalletTransaction,
  BookingFeeConfig,
  BookingConfig
};
