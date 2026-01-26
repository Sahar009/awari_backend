/**
 * Migration script to create booking_fee_configs table and seed initial data
 * Run this script with: node scripts/create-booking-fee-config-table.js
 */

import sequelize from '../database/db.js';
import BookingFeeConfig from '../schema/BookingFeeConfig.js';

const createTableAndSeedData = async () => {
    try {
        console.log('🔄 Starting migration: Create booking_fee_configs table...');

        // Sync the model to create the table
        await BookingFeeConfig.sync({ force: false });
        console.log('✅ Table booking_fee_configs created successfully');

        // Check if data already exists
        const existingFees = await BookingFeeConfig.count();
        if (existingFees > 0) {
            console.log(`⚠️  Table already contains ${existingFees} fee(s). Skipping seed data.`);
            return;
        }

        // Seed initial fee configurations
        console.log('🌱 Seeding initial fee configurations...');

        const initialFees = [
            {
                feeType: 'service_fee',
                valueType: 'percentage',
                value: 10.00,
                isActive: true,
                description: 'Default service fee - 10% of base price'
            },
            {
                feeType: 'tax',
                valueType: 'percentage',
                value: 5.00,
                isActive: true,
                description: 'Default tax - 5% of base price'
            }
        ];

        await BookingFeeConfig.bulkCreate(initialFees);
        console.log('✅ Seeded 2 initial fee configurations');

        console.log('\n📊 Current fee configurations:');
        const fees = await BookingFeeConfig.findAll();
        fees.forEach(fee => {
            console.log(`  - ${fee.feeType}: ${fee.value}% (${fee.isActive ? 'Active' : 'Inactive'})`);
        });

        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
};

// Run migration
createTableAndSeedData()
    .then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration error:', error);
        process.exit(1);
    });
