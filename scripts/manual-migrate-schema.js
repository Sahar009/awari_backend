/**
 * Manual Schema Migration for Real Images
 */
import sequelize from '../database/db.js';

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected');

        console.log('🏗️ Altering property_media table...');
        await sequelize.query('ALTER TABLE `property_media` MODIFY `url` TEXT NOT NULL;');
        await sequelize.query('ALTER TABLE `property_media` MODIFY `thumbnailUrl` TEXT NULL;');
        console.log('✅ Updated property_media URL columns');

        console.log('🏗️ Altering properties table to include "hotel" type...');
        // First check if it's already there to avoid error
        await sequelize.query("ALTER TABLE `properties` MODIFY `propertyType` ENUM('apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse', 'hotel') NOT NULL;");
        console.log('✅ Updated properties propertyType enum');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

migrate();
