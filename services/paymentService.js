import crypto from 'crypto';
import { Booking, Payment, Property, User } from '../schema/index.js';
import paystackService from '../providers/paystack/index.js';
import { messageHandler } from '../utils/index.js';
import {
  SUCCESS,
  BAD_REQUEST,
  NOT_FOUND,
  FORBIDDEN,
  CONFLICT,
  INTERNAL_SERVER_ERROR
} from '../constants/statusCode.js';
import { calculateBookingFees } from '../controllers/bookingFeeConfigController.js';

const PAYSTACK_ALLOWED_PAYOUT_ROLES = ['landlord', 'agent', 'hotel_provider', 'admin'];

const normalizeAmount = (amount) => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }
  return Number(numericAmount.toFixed(2));
};

const generateReference = (prefix = 'AWARI') => {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
};

const extractRecipientCode = (data) => {
  return (
    data?.recipient_code ||
    data?.data?.recipient_code ||
    data?.recipient?.recipient_code ||
    data?.data?.recipient?.recipient_code ||
    null
  );
};

export const initializeBookingPayment = async (currentUser, bookingId, payload = {}) => {
  try {
    console.log('💳 [Payment Service] Initializing payment for booking:', bookingId);
    console.log('💳 [Payment Service] Current user:', { id: currentUser?.id, role: currentUser?.role });

    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'ownerId']
        }
      ]
    });

    if (!booking) {
      console.error('❌ [Payment Service] Booking not found:', bookingId);
      return messageHandler('Booking not found', false, NOT_FOUND);
    }

    console.log('✅ [Payment Service] Booking found:', {
      id: booking.id,
      userId: booking.userId,
      propertyId: booking.propertyId,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus
    });

    // Validate userId exists
    if (!booking.userId) {
      console.error('❌ [Payment Service] Booking has no userId:', {
        bookingId: booking.id,
        bookingData: booking.toJSON()
      });
      return messageHandler('Booking is missing user information. Please contact support.', false, BAD_REQUEST);
    }

    if (currentUser.role !== 'admin' && booking.userId !== currentUser.id) {
      console.error('❌ [Payment Service] Authorization failed:', {
        bookingUserId: booking.userId,
        currentUserId: currentUser.id,
        userRole: currentUser.role
      });
      return messageHandler('You are not authorized to pay for this booking', false, FORBIDDEN);
    }

    if (booking.paymentStatus === 'completed') {
      return messageHandler('Payment has already been completed for this booking', false, CONFLICT);
    }

    const amount = normalizeAmount(payload.amount ?? booking.totalPrice);
    const currency = payload.currency || booking.currency || 'NGN';
    const customerEmail =
      payload.email ||
      booking.guestEmail ||
      booking.user?.email ||
      currentUser.email;

    if (!customerEmail) {
      return messageHandler('Customer email is required to initialize payment', false, BAD_REQUEST);
    }

    const reference = payload.reference || generateReference();

    // Use booking.userId (validated above) or fallback to currentUser.id as last resort
    const paymentUserId = booking.userId || currentUser.id;

    console.log('💳 [Payment Service] Using userId for payment:', paymentUserId);

    const metadata = {
      bookingId,
      userId: paymentUserId,
      ownerId: booking.ownerId,
      propertyId: booking.propertyId,
      bookingType: booking.bookingType,
      initiatedBy: currentUser.id,
      source: 'awari-backend'
    };

    const paystackResult = await paystackService.initializeTransaction(
      {
        email: customerEmail,
        amount,
        currency,
        callbackUrl: payload.callbackUrl,
        reference,
        metadata,
        channels: payload.channels,
        splitCode: payload.splitCode,
        subaccount: payload.subaccount,
        bearer: payload.bearer
      },
      (response) => response
    );

    if (!paystackResult.success) {
      console.error('❌ [Payment Service] Paystack initialization failed:', paystackResult);
      return paystackResult;
    }

    const transactionData = paystackResult.data;

    console.log('💳 [Payment Service] Creating payment record with userId:', paymentUserId);

    await Payment.upsert({
      userId: paymentUserId, // Use validated userId
      bookingId: booking.id,
      propertyId: booking.propertyId,
      amount,
      currency,
      status: 'pending',
      paymentMethod: 'paystack',
      paymentType: 'booking',
      gateway: 'paystack',
      reference: transactionData.reference,
      transactionId: transactionData.access_code,
      gatewayResponse: transactionData,
      metadata,
      description: payload.description || `Payment for booking ${booking.id}`
    });

    console.log('✅ [Payment Service] Payment record created successfully');

    await booking.update({ paymentStatus: 'pending', paymentMethod: 'paystack' });

    return messageHandler('Payment initialized successfully', true, SUCCESS, {
      authorizationUrl: transactionData.authorization_url,
      accessCode: transactionData.access_code,
      reference: transactionData.reference
    });
  } catch (error) {
    console.error('❌ [Payment Service] Initialize payment error:', error);
    console.error('❌ [Payment Service] Error stack:', error.stack);
    return messageHandler('Failed to initialize payment', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

/**
 * Initialize booking payment with booking data (Payment-First Flow)
 * Creates booking only after successful payment via webhook
 * @param {Object} currentUser - Current user object
 * @param {Object} bookingData - Complete booking data
 * @returns {Object} Payment initialization result
 */
export const initializeBookingPaymentWithData = async (currentUser, bookingData) => {
  try {
    console.log('💳 [Payment Service] Initializing payment-first booking flow');
    console.log('💳 [Payment Service] Current user:', { id: currentUser?.id, role: currentUser?.role });
    console.log('💳 [Payment Service] Booking data:', bookingData);

    // Validate current user exists in database
    if (!currentUser || !currentUser.id) {
      console.error('❌ [Payment Service] No current user or user ID');
      return messageHandler('User authentication required', false, BAD_REQUEST);
    }

    // Verify user exists in database
    const existingUser = await User.findByPk(currentUser.id);
    if (!existingUser) {
      console.error('❌ [Payment Service] User not found in database:', currentUser.id);
      return messageHandler('User not found in database', false, BAD_REQUEST);
    }

    console.log('✅ [Payment Service] User verified in database:', existingUser.id);

    const {
      propertyId,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      basePrice,
      totalPrice,
      currency = 'NGN',
      discountAmount = 0,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      couponCode,
      bookingType = 'shortlet',
      numberOfNights,
      amount,
      email,
      callbackUrl
    } = bookingData;

    // Calculate fees dynamically from database
    console.log('💰 [Payment Service] Calculating fees for basePrice:', basePrice);
    const calculatedFees = await calculateBookingFees(basePrice || totalPrice || amount);
    console.log('💰 [Payment Service] Calculated fees:', calculatedFees);

    const serviceFee = calculatedFees.serviceFee;
    const taxAmount = calculatedFees.taxAmount;

    // Validate required fields
    if (!propertyId) {
      return messageHandler('Property ID is required', false, BAD_REQUEST);
    }

    if (!totalPrice && !amount) {
      return messageHandler('Total price or amount is required', false, BAD_REQUEST);
    }

    // Fetch property to validate and get owner info
    console.log('🔍 [Payment Service] Fetching property:', propertyId);
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });

    if (!property) {
      console.error('❌ [Payment Service] Property not found:', propertyId);
      return messageHandler('Property not found', false, NOT_FOUND);
    }

    console.log('✅ [Payment Service] Property found:', {
      id: property.id,
      title: property.title,
      ownerId: property.ownerId
    });

    // Check availability if dates provided
    if (checkInDate && checkOutDate) {
      console.log('🔍 [Payment Service] Checking availability');
      const { checkDateRangeAvailability } = await import('./availabilityService.js');
      const availabilityCheck = await checkDateRangeAvailability(propertyId, checkInDate, checkOutDate);

      if (!availabilityCheck.available) {
        console.error('❌ [Payment Service] Property not available for selected dates');
        return messageHandler('Property is not available for the selected dates', false, CONFLICT, {
          conflictingDates: availabilityCheck.conflictingDates
        });
      }
      console.log('✅ [Payment Service] Property is available');
    }

    // Determine payment amount
    const paymentAmount = normalizeAmount(amount || totalPrice);
    const paymentCurrency = currency || 'NGN';

    // Determine customer email
    const customerEmail = email || guestEmail || currentUser.email;
    if (!customerEmail) {
      return messageHandler('Customer email is required to initialize payment', false, BAD_REQUEST);
    }

    // Generate reference
    const reference = generateReference('BOOK');

    // Prepare complete booking data for metadata
    const completeBookingData = {
      propertyId,
      userId: currentUser.id,
      ownerId: property.ownerId,
      bookingType: bookingType || 'shortlet',
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
      numberOfNights: numberOfNights || null,
      numberOfGuests: numberOfGuests || 1,
      basePrice: Number(basePrice || totalPrice),
      totalPrice: Number(totalPrice),
      currency: paymentCurrency,
      serviceFee: serviceFee ? Number(serviceFee) : 0,
      taxAmount: taxAmount ? Number(taxAmount) : 0,
      discountAmount: discountAmount ? Number(discountAmount) : 0,
      guestName: guestName || `${currentUser.firstName} ${currentUser.lastName}`,
      guestPhone: guestPhone || currentUser.phone || null,
      guestEmail: customerEmail,
      specialRequests: specialRequests || null,
      couponCode: couponCode || null,
      status: 'pending',
      paymentStatus: 'pending'
    };

    // Store booking data in payment metadata
    const metadata = {
      paymentType: 'booking',
      bookingData: completeBookingData,
      propertyId,
      propertyTitle: property.title,
      userId: currentUser.id,
      ownerId: property.ownerId,
      initiatedBy: currentUser.id,
      source: 'awari-mobile',
      createBookingOnSuccess: true // Flag to create booking in webhook
    };

    console.log('💳 [Payment Service] Initializing Paystack transaction');

    // Initialize Paystack transaction
    const paystackResult = await paystackService.initializeTransaction(
      {
        email: customerEmail,
        amount: paymentAmount,
        currency: paymentCurrency,
        callbackUrl,
        reference,
        metadata,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
      },
      (response) => response
    );

    if (!paystackResult.success) {
      console.error('❌ [Payment Service] Paystack initialization failed:', paystackResult);
      return paystackResult;
    }

    const transactionData = paystackResult.data;

    console.log('💳 [Payment Service] Creating payment record (without bookingId)');
    console.log('💳 [Payment Service] Payment data:', {
      userId: currentUser.id,
      propertyId: property.id,
      amount: paymentAmount,
      currency: paymentCurrency,
      reference: transactionData.reference
    });

    // Create payment record without bookingId (will be updated after booking creation)
    try {
      await Payment.create({
        userId: currentUser.id,
        bookingId: null, // Will be set after booking creation in webhook
        propertyId: property.id,
        amount: paymentAmount,
        currency: paymentCurrency,
        status: 'pending',
        paymentMethod: 'paystack',
        paymentType: 'booking',
        gateway: 'paystack',
        reference: transactionData.reference,
        transactionId: transactionData.access_code,
        gatewayResponse: transactionData,
        metadata,
        description: `Booking payment for ${property.title}` 
      });
      console.log('✅ [Payment Service] Payment record created successfully');
    } catch (dbError) {
      console.error('❌ [Payment Service] Database error creating payment:', dbError);
      throw dbError;
    }

    return messageHandler('Payment initialized successfully', true, SUCCESS, {
      authorizationUrl: transactionData.authorization_url,
      accessCode: transactionData.access_code,
      reference: transactionData.reference
    });
  } catch (error) {
    console.error('❌ [Payment Service] Initialize payment with data error:', error);
    console.error('❌ [Payment Service] Error stack:', error.stack);
    return messageHandler('Failed to initialize payment', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

export const verifyPayment = async (reference) => {

  try {
    const verification = await paystackService.verifyTransaction(reference, (response) => response);

    if (!verification.success) {
      return verification;
    }

    const { status } = verification.data;

    if (status === 'success') {
      await paystackService.handleSuccessfulPayment(verification.data);
      return messageHandler('Payment verified successfully', true, SUCCESS, verification.data);
    }

    await paystackService.handleFailedPayment(verification.data);

    return messageHandler('Payment verification completed', true, SUCCESS, verification.data);
  } catch (error) {
    console.error('Verify payment error:', error);
    return messageHandler('Failed to verify payment', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

export const handlePaystackWebhook = async (rawBody, headers) => {
  try {
    const signature = headers['x-paystack-signature'];

    if (!signature) {
      return messageHandler('Signature header missing', false, FORBIDDEN);
    }

    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

    if (!secret) {
      return messageHandler('Paystack secret key is not configured', false, INTERNAL_SERVER_ERROR);
    }

    const computedSignature = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      return messageHandler('Invalid Paystack signature', false, FORBIDDEN);
    }

    const payload = JSON.parse(rawBody);

    switch (payload.event) {
      case 'charge.success':
        await paystackService.handleSuccessfulPayment(payload.data);
        break;
      case 'charge.failed':
      case 'charge.abandoned':
        await paystackService.handleFailedPayment(payload.data);
        break;
      case 'transfer.success':
        await paystackService.handleSuccessfulTransfer(payload.data);
        break;
      case 'transfer.failed':
        await paystackService.handleFailedTransfer(payload.data);
        break;
      case 'transfer.reversed':
        await paystackService.handleReversedTransfer(payload.data);
        break;
      default:
        console.log('Unhandled Paystack webhook event:', payload.event);
    }

    return messageHandler('Webhook processed successfully', true, SUCCESS);
  } catch (error) {
    console.error('Paystack webhook error:', error);
    return messageHandler('Failed to process webhook', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

export const initiatePayout = async (currentUser, payoutData) => {
  try {
    if (!PAYSTACK_ALLOWED_PAYOUT_ROLES.includes(currentUser.role)) {
      return messageHandler('You are not authorized to initiate payouts', false, FORBIDDEN);
    }

    const amount = normalizeAmount(payoutData.amount);
    const currency = payoutData.currency || 'NGN';

    const recipientResult = await paystackService.createTransferRecipient(
      {
        accountName: payoutData.accountName,
        accountNumber: payoutData.accountNumber,
        bankCode: payoutData.bankCode
      },
      (response) => response
    );

    if (!recipientResult.success) {
      return recipientResult;
    }

    const recipientCode = extractRecipientCode(recipientResult.data);

    if (!recipientCode) {
      return messageHandler('Unable to determine transfer recipient code', false, INTERNAL_SERVER_ERROR);
    }

    const reference = payoutData.reference || generateReference('PAYOUT');

    const transferResult = await paystackService.initiateTransfer(
      {
        amount,
        recipient: recipientCode,
        reason: payoutData.reason,
        currency,
        reference,
        metadata: {
          userId: currentUser.id,
          accountNumber: payoutData.accountNumber,
          bankCode: payoutData.bankCode
        }
      },
      (response) => response
    );

    if (!transferResult.success) {
      return transferResult;
    }

    const transferData = transferResult.data;
    const payoutStatus = transferData.status === 'success' ? 'completed' : 'pending';

    const paymentRecord = await Payment.findOne({ where: { reference: transferData.reference || reference } });

    if (paymentRecord) {
      await paymentRecord.update({
        amount,
        currency,
        status: transferData.status === 'success' ? 'completed' : 'processing',
        payoutStatus,
        paymentMethod: 'bank_transfer',
        paymentType: 'payout',
        gateway: 'paystack',
        transactionId: transferData.transfer_code,
        gatewayResponse: transferData,
        failureReason: null,
        metadata: {
          ...(paymentRecord.metadata || {}),
          accountName: payoutData.accountName,
          accountNumber: payoutData.accountNumber,
          bankCode: payoutData.bankCode,
          recipientCode
        },
        description: payoutData.reason || paymentRecord.description
      });
    } else {
      await Payment.create({
        userId: currentUser.id,
        amount,
        currency,
        status: transferData.status === 'success' ? 'completed' : 'processing',
        paymentMethod: 'bank_transfer',
        paymentType: 'payout',
        gateway: 'paystack',
        reference: transferData.reference || reference,
        transactionId: transferData.transfer_code,
        gatewayResponse: transferData,
        payoutStatus,
        metadata: {
          accountName: payoutData.accountName,
          accountNumber: payoutData.accountNumber,
          bankCode: payoutData.bankCode,
          recipientCode
        },
        description: payoutData.reason || 'Payout to property owner'
      });
    }

    return messageHandler('Payout initiated successfully', true, SUCCESS, transferData);
  } catch (error) {
    console.error('Initiate payout error:', error);
    return messageHandler('Failed to initiate payout', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

export const listBanks = async () => {
  try {
    return await paystackService.getBanksList({}, (response) => response);
  } catch (error) {
    console.error('List banks error:', error);
    return messageHandler('Failed to retrieve banks', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

export const verifyBankAccount = async (payload) => {
  try {
    return await paystackService.verifyAccountNumber(
      {
        accountNumber: payload.accountNumber,
        bankCode: payload.bankCode
      },
      (response) => response
    );
  } catch (error) {
    console.error('Verify bank account error:', error);
    return messageHandler('Failed to verify bank account', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};

/**
 * Initialize subscription payment
 * @param {Object} currentUser - Current user
 * @param {string} subscriptionId - Subscription ID
 * @param {Object} payload - Payment payload
 * @returns {Object} Payment initialization result
 */
export const initializeSubscriptionPayment = async (currentUser, subscriptionId, payload = {}) => {
  try {
    const { Subscription } = await import('../schema/index.js');

    const subscription = await Subscription.findByPk(subscriptionId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone']
        }
      ]
    });

    if (!subscription) {
      return messageHandler('Subscription not found', false, NOT_FOUND);
    }

    if (currentUser.role !== 'admin' && subscription.userId !== currentUser.id) {
      return messageHandler('You are not authorized to pay for this subscription', false, FORBIDDEN);
    }

    if (subscription.status === 'active') {
      return messageHandler('Subscription is already active', false, CONFLICT);
    }

    const amount = normalizeAmount(payload.amount || (subscription.billingCycle === 'yearly' ? subscription.yearlyPrice : subscription.monthlyPrice));
    const currency = payload.currency || subscription.currency || 'NGN';
    const customerEmail = payload.email || subscription.user?.email || currentUser.email;

    if (!customerEmail) {
      return messageHandler('Customer email is required to initialize payment', false, BAD_REQUEST);
    }

    const reference = payload.reference || generateReference('SUB');

    const metadata = {
      subscriptionId,
      userId: subscription.userId,
      planType: subscription.planType,
      planName: subscription.planName,
      billingCycle: subscription.billingCycle,
      initiatedBy: currentUser.id,
      source: 'awari-backend'
    };

    const paystackResult = await paystackService.initializeTransaction(
      {
        email: customerEmail,
        amount,
        currency,
        callbackUrl: payload.callbackUrl,
        reference,
        metadata,
        channels: payload.channels
      },
      (response) => response
    );

    if (!paystackResult.success) {
      return paystackResult;
    }

    // Create payment record
    const paymentRecord = await Payment.create({
      userId: subscription.userId,
      propertyId: subscriptionId, // Using propertyId field to store subscriptionId
      amount,
      currency,
      status: 'pending',
      paymentType: 'subscription',
      paymentMethod: 'paystack',
      gateway: 'paystack',
      reference,
      transactionId: paystackResult.data?.transaction?.reference || reference,
      gatewayResponse: paystackResult.data,
      description: `Subscription payment for ${subscription.planName}`,
      metadata
    });

    return messageHandler('Payment initialized successfully', true, SUCCESS, {
      payment: paymentRecord,
      authorizationUrl: paystackResult.data?.authorization_url,
      accessCode: paystackResult.data?.access_code,
      reference
    });
  } catch (error) {
    console.error('Initialize subscription payment error:', error);
    return messageHandler('Failed to initialize subscription payment', false, INTERNAL_SERVER_ERROR, {
      error: error.message
    });
  }
};


