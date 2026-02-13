import BookingConfig from '../schema/BookingConfig.js';
import { connectToDB } from '../database/db.js';

/**
 * Seed default booking configuration values
 */
async function seedBookingConfig() {
    console.log('🌱 [SEED] Seeding booking configuration...');

    const defaults = [
        {
            key: 'auto_cancel_hours',
            value: '24',
            description: 'Number of hours after which an unconfirmed booking (pending/in_progress) is automatically cancelled. Set to 0 to disable auto-cancellation.',
        },
    ];

    try {
        await connectToDB();

        for (const config of defaults) {
            const [record, created] = await BookingConfig.findOrCreate({
                where: { key: config.key },
                defaults: config
            });

            if (created) {
                console.log(`  ✅ Created: ${config.key} = ${config.value}`);
            } else {
                console.log(`  ⏭️  Skipped (already exists): ${config.key} = ${record.value}`);
            }
        }

        console.log('🌱 [SEED] Booking configuration seeded successfully');
    } catch (error) {
        console.error('❌ [SEED] Error seeding booking config:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedBookingConfig()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('💥 [SEED] Script crashed:', error);
            process.exit(1);
        });
}

export default seedBookingConfig;
