import { BAD_REQUEST, SUCCESS } from "../../constants/statusCode.js";
import { messageHandler } from "../../utils/index.js";
import axios from 'axios';
import { Payment, Booking } from "../../schema/index.js";

const PAYSTACK_DECIMAL_FACTOR = 100;



class PaystackService {
    constructor() {
        if (!PaystackService.instance) {
            this.initialize();
            PaystackService.instance = this;
        }
        return PaystackService.instance;
    }

    initialize() {
        try {
            this.baseURL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
            this.secretKey = process.env.PAYSTACK_SECRET_KEY;

            this.api = axios.create({
                baseURL: this.baseURL,
                timeout: 10000,
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    "Content-Type": "application/json"
                }
            });

            this.setupInterceptors();
            console.log('Paystack Service initialized successfully');
        } catch (error) {
            console.error('Paystack Service initialization error:', error);
            throw error;
        }
    }

    setupInterceptors() {
        this.api.interceptors.request.use(
            request => {
                console.log('Request:', {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    data: request.data
                });
                return request;
            },
            error => {
                console.error('Request Error:', error);
                return Promise.reject(error);
            }
        );

        this.api.interceptors.response.use(
            response => {
                console.log('Response:', response.data);
                return response;
            },
            error => {
                console.error('Error Response:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    mapChannelToPaymentMethod(channel) {
        if (!channel) return 'paystack';
        const normalized = channel.toLowerCase();
        if (normalized.includes('card')) {
            return 'card';
        }
        if (normalized.includes('bank')) {
            return 'bank_transfer';
        }
        return 'paystack';
    }

    normalizeAmount(amount) {
        if (amount === undefined || amount === null) {
            throw new Error('Amount is required for Paystack operations');
        }

        const numericAmount = Number(amount);

        if (Number.isNaN(numericAmount) || numericAmount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        return Math.round(numericAmount * PAYSTACK_DECIMAL_FACTOR);
    }

    async initializeTransaction(data, callback) {
        try {
            if (!data?.email) {
                throw new Error('Customer email is required for transaction initialization');
            }

            const payload = {
                email: data.email,
                amount: this.normalizeAmount(data.amount),
                currency: data.currency || 'NGN',
                callback_url: data.callbackUrl,
                reference: data.reference,
                metadata: data.metadata,
                channels: data.channels,
                split_code: data.splitCode,
                subaccount: data.subaccount,
                bearer: data.bearer,
                invoice_limit: data.invoiceLimit
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === undefined || payload[key] === null) {
                    delete payload[key];
                }
            });

            const response = await this.api.post('/transaction/initialize', payload);

            return callback(
                messageHandler(
                    "Transaction initialized successfully",
                    true,
                    SUCCESS,
                    response.data.data
                )
            );
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to initialize transaction';
            return callback(
                messageHandler(
                    message,
                    false,
                    BAD_REQUEST,
                    error.response?.data
                )
            );
        }

    }
    async verifyTransaction(reference, callback) {
        try {
            if (!reference) {
                throw new Error('Transaction reference is required for verification');
            }

            const response = await this.api.get(`/transaction/verify/${reference}`);

            return callback(
                messageHandler(
                    "Transaction verified successfully",
                    true,
                    SUCCESS,
                    response.data.data
                )
            );
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to verify transaction';
            return callback(
                messageHandler(
                    message,
                    false,
                    BAD_REQUEST,
                    error.response?.data
                )
            );
        }
    }

    async createTransferRecipient(data, callback) {
        try {
            const payload = {
                type: "nuban",
                name: data.accountName,
                account_number: data.accountNumber,
                bank_code: data.bankCode,
                currency: "NGN"
            };

            const response = await this.api.post('/transferrecipient', payload);
            return callback(messageHandler("Transfer recipient created successfully", true, SUCCESS, response.data.data));
        } catch (error) {
            const duplicateData = error.response?.data?.data;
            if (error.response?.data?.message?.toLowerCase().includes('duplicate account') && duplicateData) {
                return callback(
                    messageHandler(
                        "Transfer recipient already exists",
                        true,
                        SUCCESS,
                        duplicateData
                    )
                );
            }
            console.error("Error creating transfer recipient:", error.response?.data || error.message);
            return callback(messageHandler("Failed to create transfer recipient", false, BAD_REQUEST));
        }
    }

    async initiateTransfer(data, callback) {
        try {
            if (!data?.recipient) {
                throw new Error('Transfer recipient code is required');
            }

            const payload = {
                source: data.source || 'balance',
                amount: this.normalizeAmount(data.amount),
                recipient: data.recipient,
                reason: data.reason,
                currency: data.currency || 'NGN',
                reference: data.reference,
                metadata: data.metadata
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === undefined || payload[key] === null) {
                    delete payload[key];
                }
            });

            const response = await this.api.post('/transfer', payload);

            return callback(
                messageHandler(
                    "Transfer initiated successfully",
                    true,
                    SUCCESS,
                    response.data.data
                )
            );
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to initiate transfer';
            return callback(
                messageHandler(
                    message,
                    false,
                    BAD_REQUEST,
                    error.response?.data
                )
            );
        }

    }

    async getBanksList(callback) {
        try {
            const response = await this.api.get('/bank');
            return callback(messageHandler("Banks list retrieved successfully", true, SUCCESS, response.data.data));
        } catch (error) {
            console.error("Error retrieving banks:", error.response?.data || error.message);
            return callback(messageHandler("Failed to retrieve banks", false, BAD_REQUEST));
        }
    }

    async verifyAccountNumber(data, callback) {
        try {
            const response = await this.api.get(
                `/bank/resolve?account_number=${data.accountNumber}&bank_code=${data.bankCode}`
            );
            return callback(messageHandler("Account verified successfully", true, SUCCESS, response.data.data));
        } catch (error) {
            console.error("Error verifying account:", error.response?.data || error.message);
            return callback(messageHandler("Failed to verify account", false, BAD_REQUEST));
        }
    }

    async getTransactionsList(filters, callback) {
        try {
            const response = await this.api.get('/merchant/transactions', {
                params: {
                    pageSize: filters.pageSize || 10,
                    pageNo: filters.pageNo || 1,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    paymentStatus: filters.paymentStatus
                }
            });
            return callback(messageHandler("Transactions list retrieved successfully", true, SUCCESS, response.data.data));
        } catch (error) {
            console.error("Error retrieving transactions:", error.response?.data || error.message);
            return callback(messageHandler("Failed to retrieve transactions", false, BAD_REQUEST));
        }
    }

    async handleWebhook(payload, callback) {
        try {
            const { event, data } = payload;

            switch (event) {
                case 'charge.success':
                    await this.handleSuccessfulPayment(data);
                    break;
                case 'charge.failed':
                case 'charge.abandoned':
                    await this.handleFailedPayment(data);
                    break;
                case 'transfer.success':
                    await this.handleSuccessfulTransfer(data);
                    break;
                case 'transfer.failed':
                    await this.handleFailedTransfer(data);
                    break;
                case 'transfer.reversed':
                    await this.handleReversedTransfer(data);
                    break;
                default:
                    console.log('Unhandled webhook event:', event);
            }

            return callback(messageHandler("Webhook processed successfully", true, SUCCESS));
        } catch (error) {
            console.error("Webhook processing error:", error);
            return callback(messageHandler("Webhook processing failed", false, BAD_REQUEST));
        }
    }

    async handleSuccessfulPayment(data) {
        try {
            const reference = data?.reference;

            if (!reference) {
                throw new Error('Payment reference not provided');
            }

            const payment = await Payment.findOne({ where: { reference } });

            if (!payment) {
                console.warn(`Payment record not found for reference ${reference}`);
                return;
            }

            console.log('✅ [Paystack Webhook] Processing successful payment:', reference);
            console.log('✅ [Paystack Webhook] Payment metadata:', payment.metadata);

            let booking = payment.bookingId ? await Booking.findByPk(payment.bookingId) : null;
            const amountMajor = data?.amount ? (Number(data.amount) / PAYSTACK_DECIMAL_FACTOR).toFixed(2) : payment.amount;
            const paymentMethod = this.mapChannelToPaymentMethod(data?.channel);

            // Check if we need to create booking from metadata (Payment-First Flow)
            if (!booking && payment.metadata?.createBookingOnSuccess && payment.metadata?.bookingData) {
                console.log('🆕 [Paystack Webhook] Creating booking from payment metadata');

                try {
                    const bookingData = payment.metadata.bookingData;

                    // Create the booking
                    booking = await Booking.create({
                        ...bookingData,
                        status: 'confirmed', // Set to confirmed since payment is successful
                        paymentStatus: 'completed',
                        paymentMethod,
                        transactionId: reference
                    });

                    console.log('✅ [Paystack Webhook] Booking created successfully:', booking.id);

                    // Update payment record with bookingId
                    await payment.update({
                        bookingId: booking.id
                    });

                    // Block dates for the booking
                    try {
                        const { blockDatesForBooking } = await import('../../services/availabilityService.js');
                        await blockDatesForBooking(booking);
                        console.log('✅ [Paystack Webhook] Dates blocked for booking:', booking.id);
                    } catch (blockError) {
                        console.error('❌ [Paystack Webhook] Error blocking dates:', blockError);
                        // Don't fail the payment processing if date blocking fails
                    }
                } catch (bookingError) {
                    console.error('❌ [Paystack Webhook] Error creating booking from metadata:', bookingError);
                    // Update payment but mark as needing manual review
                    await payment.update({
                        status: 'completed',
                        amount: amountMajor,
                        currency: data?.currency || payment.currency,
                        paymentMethod,
                        transactionId: data?.id?.toString() || reference,
                        gateway: 'paystack',
                        gatewayResponse: data,
                        failureReason: `Booking creation failed: ${bookingError.message}`,
                        metadata: {
                            ...payment.metadata,
                            bookingCreationError: bookingError.message,
                            requiresManualReview: true
                        }
                    });
                    return; // Exit early since booking creation failed
                }
            }

            // Update payment record
            await payment.update({
                status: 'completed',
                amount: amountMajor,
                currency: data?.currency || payment.currency,
                paymentMethod,
                transactionId: data?.id?.toString() || reference,
                gateway: 'paystack',
                gatewayResponse: data,
                failureReason: null,
                payoutStatus: payment.paymentType === 'payout' ? 'completed' : payment.payoutStatus
            });

            if (booking) {
                // Update booking if it already exists (old flow) or was just created (new flow)
                await booking.update({
                    paymentStatus: 'completed',
                    paymentMethod,
                    transactionId: reference,
                    status: booking.bookingType === 'shortlet' && booking.status === 'pending' ? 'confirmed' : booking.status
                });

                // Send booking receipt email
                try {
                    const { sendBookingReceipt } = await import('../../services/bookingService.js');
                    const { User } = await import('../../schema/index.js');

                    const user = await User.findByPk(booking.userId);
                    if (user) {
                        // Fetch booking with relations
                        const Booking = (await import('../../schema/Booking.js')).default;
                        const Property = (await import('../../schema/Property.js')).default;

                        const bookingWithRelations = await Booking.findByPk(booking.id, {
                            include: [
                                {
                                    model: Property,
                                    as: 'property',
                                    include: [
                                        {
                                            model: User,
                                            as: 'owner',
                                            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
                                        }
                                    ]
                                },
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
                                }
                            ]
                        });

                        await sendBookingReceipt(bookingWithRelations, user, payment);
                        console.log('✅ [Paystack Webhook] Booking receipt sent');
                    }
                } catch (receiptError) {
                    console.error('❌ [Paystack Webhook] Error sending booking receipt:', receiptError);
                    // Don't fail the payment processing if receipt email fails
                }
            }

            // Handle subscription payments
            if (payment.paymentType === 'subscription' && payment.propertyId) {
                const { Subscription } = await import('../../schema/index.js');
                const subscriptionService = (await import('../../services/subscriptionService.js')).default;

                const subscription = await Subscription.findByPk(payment.propertyId);
                if (subscription && subscription.status !== 'active') {
                    await subscriptionService.activateSubscription(subscription.id);
                }
            }

            console.log('✅ [Paystack Webhook] Payment processing completed successfully');
        } catch (error) {
            console.error('❌ [Paystack Webhook] Error handling successful payment:', error);
            console.error('❌ [Paystack Webhook] Error stack:', error.stack);
        }

    }

    async handleFailedPayment(data) {
        try {
            const reference = data?.reference;

            if (!reference) {
                throw new Error('Payment reference not provided');
            }

            const payment = await Payment.findOne({ where: { reference } });

            if (!payment) {
                console.warn(`Payment record not found for failed reference ${reference}`);
                return;
            }

            const booking = payment.bookingId ? await Booking.findByPk(payment.bookingId) : null;

            await payment.update({
                status: 'failed',
                failureReason: data?.gateway_response || data?.message || 'Payment failed',
                gatewayResponse: data,
                paymentMethod: this.mapChannelToPaymentMethod(data?.channel) || payment.paymentMethod,
                payoutStatus: payment.paymentType === 'payout' ? 'failed' : payment.payoutStatus
            });

            if (booking) {
                await booking.update({
                    paymentStatus: 'failed'
                });
            }
        } catch (error) {
            console.error('Error handling failed payment:', error);
        }

    }

    async handleSuccessfulTransfer(data) {
        try {
            const reference = data?.reference || data?.transfer_code;

            if (!reference) {
                throw new Error('Transfer reference not provided');
            }

            const payment = await Payment.findOne({ where: { reference } });

            if (!payment) {
                console.warn(`Payout record not found for transfer reference ${reference}`);
                return;
            }

            await payment.update({
                status: 'completed',
                payoutStatus: 'completed',
                transactionId: data?.transfer_code || payment.transactionId,
                gateway: 'paystack',
                gatewayResponse: data,
                failureReason: null
            });
        } catch (error) {
            console.error('Error handling successful transfer:', error);
        }

    }

    async handleFailedTransfer(data) {
        try {
            const reference = data?.reference || data?.transfer_code;

            if (!reference) {
                throw new Error('Transfer reference not provided');
            }

            const payment = await Payment.findOne({ where: { reference } });

            if (!payment) {
                console.warn(`Payout record not found for failed transfer reference ${reference}`);
                return;
            }

            await payment.update({
                status: 'failed',
                payoutStatus: 'failed',
                failureReason: data?.reason || data?.gateway_response || 'Transfer failed',
                gatewayResponse: data
            });
        } catch (error) {
            console.error('Error handling failed transfer:', error);
        }

    }

    async handleReversedTransfer(data) {
        try {
            const reference = data?.reference || data?.transfer_code;

            if (!reference) {
                throw new Error('Transfer reference not provided');
            }

            const payment = await Payment.findOne({ where: { reference } });

            if (!payment) {
                console.warn(`Payout record not found for reversed transfer reference ${reference}`);
                return;
            }

            await payment.update({
                status: 'refunded',
                payoutStatus: 'failed',
                failureReason: 'Transfer reversed by payment gateway',
                gatewayResponse: data
            });
        } catch (error) {
            console.error('Error handling reversed transfer:', error);
        }

    }

    async createDedicatedVirtualAccount(userData, callback) {
        try {
            const payload = {
                customer: userData.customerCode,
                preferred_bank: userData.preferredBank,
                subaccount: userData.subaccount,
                split_code: userData.splitCode,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone,
                email: userData.email,
                country: userData.country || 'NG'
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === undefined || payload[key] === null) {
                    delete payload[key];
                }
            });

            if (!payload.customer) {
                throw new Error('Paystack customer code is required to create a dedicated account');
            }

            const response = await this.api.post('/dedicated_account', payload);

            return callback(messageHandler("Dedicated account created successfully", true, SUCCESS, response.data.data));
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to create dedicated account';
            return callback(messageHandler(message, false, BAD_REQUEST, error.response?.data));
        }

    }

    async getDedicatedAccounts(customerCode, callback) {
        try {
            const response = await this.api.get(`/dedicated_account?customer=${customerCode}`);
            return callback(messageHandler("Virtual accounts retrieved", true, SUCCESS, response.data.data));
        } catch (error) {
            console.error("Get DVA error:", error.response?.data || error.message);
            return callback(messageHandler("Failed to get accounts", false, BAD_REQUEST));
        }
    }

    async deactivateDedicatedAccount(accountId, callback) {
        try {
            const response = await this.api.delete(`/dedicated_account/${accountId}`);
            return callback(messageHandler("Account deactivated", true, SUCCESS, response.data.data));
        } catch (error) {
            console.error("Deactivation error:", error.response?.data || error.message);
            return callback(messageHandler("Failed to deactivate account", false, BAD_REQUEST));
        }
    }
}

// Create and export singleton instance
const paystackService = new PaystackService();
export default paystackService;