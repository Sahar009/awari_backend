import sequelize from './database/db.js';
import { QueryTypes } from 'sequelize';

async function migrate() {
    console.log('🚀 Starting database migration...');

    try {
        // 1. Update Properties table
        console.log('📝 Checking Properties table...');
        const [propColumns] = await sequelize.query("DESCRIBE properties");
        const hasSource = propColumns.find(col => col.Field === 'source');

        if (!hasSource) {
            console.log('➕ Adding source, externalId, and externalData to properties...');
            await sequelize.query(`
        ALTER TABLE properties 
        ADD COLUMN source ENUM('local', 'booking_com', 'expedia') DEFAULT 'local' NOT NULL,
        ADD COLUMN externalId VARCHAR(255) NULL,
        ADD COLUMN externalData JSON NULL
      `);
        } else {
            console.log('ℹ️ Property columns already exist.');
        }

        // 2. Update Bookings table
        console.log('📝 Checking Bookings table...');
        const [bookColumns] = await sequelize.query("DESCRIBE bookings");
        const hasExtBookingId = bookColumns.find(col => col.Field === 'externalBookingId');

        if (!hasExtBookingId) {
            console.log('➕ Adding externalBookingId and externalStatus to bookings...');
            await sequelize.query(`
        ALTER TABLE bookings 
        ADD COLUMN externalBookingId VARCHAR(255) NULL,
        ADD COLUMN externalStatus VARCHAR(100) NULL
      `);
        } else {
            console.log('ℹ️ Booking columns already exist.');
        }

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrate();
