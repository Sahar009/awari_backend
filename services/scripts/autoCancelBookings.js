import Booking from '../../schema/Booking.js';
import BookingConfig from '../../schema/BookingConfig.js';
import Property from '../../schema/Property.js';
import User from '../../schema/User.js';
import WalletTransaction from '../../schema/WalletTransaction.js';
import walletService from '../walletService.js';
import { unblockDatesForBooking } from '../availabilityService.js';
import { sendEmail } from '../../modules/notifications/email.js';
import { createNotification } from '../notificationService.js';
import { Op } from 'sequelize';

/**
 * Auto-Cancel Unconfirmed Bookings Script
 *
 * Automatically cancels bookings that remain in 'pending' or 'in_progress'
 * status (not confirmed by owner/agent) after a configurable number of hours.
 *
 * If the booking was paid for:
 *   1. Debit landlord's pending wallet balance
 *   2. Refund the guest's wallet (available balance)
 *   3. Unblock the booked dates
 *   4. Send cancellation + refund email to the guest
 *   5. Notify the owner
 *
 * The timeout is read from BookingConfig table (key: 'auto_cancel_hours').
 * Fallback: process.env.AUTO_CANCEL_HOURS or 24 hours.
 *
 * Should be run hourly via cron job.
 */

const DEFAULT_AUTO_CANCEL_HOURS = 24;

async function getAutoCancelHours() {
    // 1. Try DB config (admin-configurable)
    const dbValue = await BookingConfig.getNumericValue('auto_cancel_hours', 0);
    if (dbValue > 0) {
        console.log(`⏰ [AUTO-CANCEL] Using DB config: ${dbValue} hours`);
        return dbValue;
    }

    // 2. Try env variable
    if (process.env.AUTO_CANCEL_HOURS) {
        const envValue = parseFloat(process.env.AUTO_CANCEL_HOURS);
        if (!isNaN(envValue) && envValue > 0) {
            console.log(`⏰ [AUTO-CANCEL] Using ENV config: ${envValue} hours`);
            return envValue;
        }
    }

    // 3. Default
    console.log(`⏰ [AUTO-CANCEL] Using default: ${DEFAULT_AUTO_CANCEL_HOURS} hours`);
    return DEFAULT_AUTO_CANCEL_HOURS;
}

async function autoCancelBookings() {
    console.log('🔄 [AUTO-CANCEL] Starting auto-cancel of unconfirmed bookings...');
    console.log(`📅 [AUTO-CANCEL] Current time: ${new Date().toISOString()}`);

    try {
        const autoCancelHours = await getAutoCancelHours();
        const cutoffDate = new Date(Date.now() - autoCancelHours * 60 * 60 * 1000);

        console.log(`⏰ [AUTO-CANCEL] Timeout: ${autoCancelHours} hours`);
        console.log(`⏰ [AUTO-CANCEL] Cutoff: bookings created before ${cutoffDate.toISOString()}`);

        // Find bookings that are pending/in_progress for shortlets and hotels, older than the cutoff
        const expiredBookings = await Booking.findAll({
            where: {
                status: { [Op.in]: ['pending', 'in_progress'] },
                paymentStatus: { [Op.in]: ['completed', 'partial'] },
                bookingType: { [Op.in]: ['shortlet', 'hotel'] },
                createdAt: { [Op.lt]: cutoffDate }
            },
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['id', 'title', 'address']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        console.log(`📊 [AUTO-CANCEL] Found ${expiredBookings.length} expired unconfirmed bookings`);

        if (expiredBookings.length === 0) {
            console.log('✅ [AUTO-CANCEL] No bookings to auto-cancel');
            return { success: true, cancelled: 0, refunded: 0, failed: 0 };
        }

        let cancelled = 0;
        let refunded = 0;
        let failed = 0;
        const errors = [];

        for (const booking of expiredBookings) {
            try {
                console.log('');
                console.log(`🔸 [AUTO-CANCEL] Processing booking ${booking.id}`);
                console.log(`   Status: ${booking.status} | Payment: ${booking.paymentStatus}`);
                console.log(`   Property: ${booking.property?.title || booking.propertyId}`);
                console.log(`   Guest: ${booking.user?.firstName} ${booking.user?.lastName} (${booking.user?.email})`);
                console.log(`   Created: ${booking.createdAt}`);

                let refundProcessed = false;

                // Handle refund if booking was paid
                if (['completed', 'partial'].includes(booking.paymentStatus) && parseFloat(booking.totalPrice) > 0) {
                    try {
                        console.log(`   💰 Processing refund for paid booking...`);

                        // Debit landlord's pending balance if applicable
                        if (booking.walletStatus === 'pending' && booking.walletTransactionId) {
                            const walletTxn = await WalletTransaction.findByPk(booking.walletTransactionId);
                            if (walletTxn) {
                                await walletService.debitPending(
                                    booking.ownerId,
                                    walletTxn.amount,
                                    booking.id,
                                    `Auto-cancelled: booking not confirmed within ${autoCancelHours} hours`
                                );
                                console.log(`   ✅ Landlord pending balance debited: ${walletTxn.amount} NGN`);
                            }
                        }

                        // Refund guest's wallet (available balance)
                        await walletService.processRefund(
                            booking.userId,
                            booking.totalPrice,
                            `Auto-cancel refund for booking #${booking.id.substring(0, 8)} — not confirmed within ${autoCancelHours} hours`,
                            booking.id,
                            { type: 'auto_cancel_refund', autoCancelHours }
                        );

                        refundProcessed = true;
                        refunded++;
                        console.log(`   ✅ Guest refunded: ${booking.totalPrice} NGN to wallet`);
                    } catch (refundError) {
                        console.error(`   ❌ Refund failed: ${refundError.message}`);
                        // Continue with cancellation even if refund fails
                    }
                }

                // Update booking status
                await booking.update({
                    status: 'cancelled',
                    paymentStatus: refundProcessed ? 'refunded' : booking.paymentStatus,
                    walletStatus: refundProcessed ? 'refunded' : booking.walletStatus,
                    cancellationReason: `Automatically cancelled — booking was not confirmed within ${autoCancelHours} hours`,
                    cancelledAt: new Date()
                });

                // Unblock dates
                if (['shortlet', 'rental', 'hotel'].includes(booking.bookingType) &&
                    booking.checkInDate && booking.checkOutDate) {
                    try {
                        await unblockDatesForBooking(booking.propertyId, booking.id);
                        console.log(`   ✅ Dates unblocked for property ${booking.propertyId}`);
                    } catch (unblockError) {
                        console.error(`   ❌ Failed to unblock dates: ${unblockError.message}`);
                    }
                }

                // Send cancellation email to guest
                if (booking.user?.email) {
                    try {
                        const refundText = refundProcessed
                            ? `A full refund of ₦${parseFloat(booking.totalPrice).toLocaleString()} has been credited to your AWARI wallet.`
                            : '';

                        await sendEmail(
                            booking.user.email,
                            'Booking Auto-Cancelled — AWARI',
                            `Hi ${booking.user.firstName}, your booking for ${booking.property?.title || 'the property'} has been automatically cancelled because it was not confirmed within ${autoCancelHours} hours. ${refundText}`,
                            'booking-cancelled',
                            {
                                user: booking.user,
                                booking,
                                property: booking.property,
                                refundProcessed,
                                refundAmount: refundProcessed ? parseFloat(booking.totalPrice).toLocaleString() : null,
                                autoCancelHours,
                                isAutoCancel: true,
                                actionUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/properties` : 'https://awarihomes.com/properties',
                                actionText: 'Find Alternative Properties'
                            }
                        );
                        console.log(`   ✅ Cancellation email sent to ${booking.user.email}`);
                    } catch (emailError) {
                        console.error(`   ❌ Failed to send email: ${emailError.message}`);
                    }

                    // Create in-app notification for guest
                    try {
                        await createNotification({
                            userId: booking.userId,
                            title: 'Booking Auto-Cancelled',
                            message: `Your booking for ${booking.property?.title || 'the property'} has been automatically cancelled because it was not confirmed within ${autoCancelHours} hours.${refundProcessed ? ` A refund of ₦${parseFloat(booking.totalPrice).toLocaleString()} has been credited to your AWARI wallet.` : ''}`,
                            type: 'booking_cancelled',
                            category: 'booking',
                            priority: 'high',
                            bookingId: booking.id,
                            propertyId: booking.propertyId,
                            metadata: {
                                refundProcessed,
                                refundAmount: refundProcessed ? parseFloat(booking.totalPrice) : null,
                                autoCancelHours,
                                isAutoCancel: true
                            }
                        });
                        console.log(`   ✅ In-app notification created for guest ${booking.userId}`);
                    } catch (notifError) {
                        console.error(`   ❌ Failed to create guest notification: ${notifError.message}`);
                    }
                }

                // Send notification email to owner about missed confirmation
                if (booking.owner?.email) {
                    try {
                        await sendEmail(
                            booking.owner.email,
                            'Booking Expired — Not Confirmed in Time',
                            `Hi ${booking.owner.firstName}, a booking for your property "${booking.property?.title || ''}" by ${booking.user?.firstName} ${booking.user?.lastName} was automatically cancelled because it was not confirmed within ${autoCancelHours} hours. Please try to confirm bookings promptly to avoid losing guests.`,
                            null, // plain text email, no template
                            null
                        );
                        console.log(`   ✅ Owner notification sent to ${booking.owner.email}`);
                    } catch (emailError) {
                        console.error(`   ❌ Failed to send owner email: ${emailError.message}`);
                    }

                    // Create in-app notification for owner
                    try {
                        await createNotification({
                            userId: booking.ownerId,
                            title: 'Booking Missed Confirmation',
                            message: `A booking for your property "${booking.property?.title || ''}" by ${booking.user?.firstName} ${booking.user?.lastName} was automatically cancelled because it was not confirmed within ${autoCancelHours} hours. Please confirm bookings promptly to avoid losing guests.`,
                            type: 'booking_missed_confirmation',
                            category: 'booking',
                            priority: 'high',
                            bookingId: booking.id,
                            propertyId: booking.propertyId,
                            metadata: {
                                guestId: booking.userId,
                                autoCancelHours
                            }
                        });
                        console.log(`   ✅ In-app notification created for owner ${booking.ownerId}`);
                    } catch (notifError) {
                        console.error(`   ❌ Failed to create owner notification: ${notifError.message}`);
                    }
                }

                cancelled++;
                console.log(`   ✅ Booking ${booking.id} auto-cancelled successfully`);

            } catch (error) {
                failed++;
                console.error(`   ❌ Failed to auto-cancel booking ${booking.id}: ${error.message}`);
                errors.push({ bookingId: booking.id, error: error.message });
            }
        }

        console.log('');
        console.log('📈 [AUTO-CANCEL] Summary:');
        console.log(`   Total expired bookings: ${expiredBookings.length}`);
        console.log(`   Cancelled: ${cancelled}`);
        console.log(`   Refunded: ${refunded}`);
        console.log(`   Failed: ${failed}`);

        if (errors.length > 0) {
            console.log('');
            console.log('❌ [AUTO-CANCEL] Errors:');
            errors.forEach(err => {
                console.log(`   - Booking ${err.bookingId}: ${err.error}`);
            });
        }

        return { success: true, cancelled, refunded, failed, errors };

    } catch (error) {
        console.error('❌ [AUTO-CANCEL] Fatal error:', error);
        return { success: false, error: error.message };
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    autoCancelBookings()
        .then((result) => {
            console.log('');
            console.log('🏁 [AUTO-CANCEL] Script completed');
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 [AUTO-CANCEL] Script crashed:', error);
            process.exit(1);
        });
}

export default autoCancelBookings;
