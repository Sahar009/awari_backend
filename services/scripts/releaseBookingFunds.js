import Booking from '../schema/Booking.js';
import walletService from './walletService.js';
import { Op } from 'sequelize';

/**
 * Release Booking Funds Script
 * 
 * This script automatically releases pending wallet funds to available balance
 * when the booking check-in date is reached.
 * 
 * Should be run daily via cron job at midnight.
 */

async function releaseCompletedBookings() {
    console.log('🔄 [RELEASE FUNDS] Starting automatic fund release...');
    console.log(`📅 [RELEASE FUNDS] Current date: ${new Date().toISOString().split('T')[0]}`);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day

        // Find bookings with pending wallet status and check-in date <= today
        const bookings = await Booking.findAll({
            where: {
                checkInDate: {
                    [Op.lte]: today
                },
                walletStatus: 'pending',
                paymentStatus: 'completed' // Only release for completed payments
            }
        });

        console.log(`📊 [RELEASE FUNDS] Found ${bookings.length} bookings ready for fund release`);

        if (bookings.length === 0) {
            console.log('✅ [RELEASE FUNDS] No bookings to process');
            return {
                success: true,
                processed: 0,
                failed: 0
            };
        }

        let processed = 0;
        let failed = 0;
        const errors = [];

        for (const booking of bookings) {
            try {
                console.log(`💰 [RELEASE FUNDS] Processing booking ${booking.id}...`);
                console.log(`   Property: ${booking.propertyId}`);
                console.log(`   Check-in: ${booking.checkInDate}`);
                console.log(`   Owner: ${booking.ownerId}`);

                // Release pending funds to available balance
                await walletService.releasePending(booking.id);

                processed++;
                console.log(`✅ [RELEASE FUNDS] Successfully released funds for booking ${booking.id}`);

            } catch (error) {
                failed++;
                console.error(`❌ [RELEASE FUNDS] Failed to release funds for booking ${booking.id}:`, error.message);
                errors.push({
                    bookingId: booking.id,
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('📈 [RELEASE FUNDS] Summary:');
        console.log(`   Total bookings: ${bookings.length}`);
        console.log(`   Successfully processed: ${processed}`);
        console.log(`   Failed: ${failed}`);

        if (errors.length > 0) {
            console.log('');
            console.log('❌ [RELEASE FUNDS] Errors:');
            errors.forEach(err => {
                console.log(`   - Booking ${err.bookingId}: ${err.error}`);
            });
        }

        return {
            success: true,
            processed,
            failed,
            errors
        };

    } catch (error) {
        console.error('❌ [RELEASE FUNDS] Fatal error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    releaseCompletedBookings()
        .then((result) => {
            console.log('');
            console.log('🏁 [RELEASE FUNDS] Script completed');
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 [RELEASE FUNDS] Script crashed:', error);
            process.exit(1);
        });
}

export default releaseCompletedBookings;
