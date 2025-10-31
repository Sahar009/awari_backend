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
      return messageHandler('Booking not found', false, NOT_FOUND);
    }

    if (currentUser.role !== 'admin' && booking.userId !== currentUser.id) {
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

    const metadata = {
      bookingId,
      userId: booking.userId,
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
      return paystackResult;
    }

    const transactionData = paystackResult.data;

    await Payment.upsert({
      userId: booking.userId,
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

    await booking.update({ paymentStatus: 'pending', paymentMethod: 'paystack' });

    return messageHandler('Payment initialized successfully', true, SUCCESS, {
      authorizationUrl: transactionData.authorization_url,
      accessCode: transactionData.access_code,
      reference: transactionData.reference
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
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


