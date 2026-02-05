import sequelize from '../database/db.js';

async function migrateBookingFees() {
  try {
    console.log('🔄 Starting BookingFeeConfig migration...');

    // Add propertyType column
    console.log('📝 Adding propertyType column...');
    await sequelize.query(`
      ALTER TABLE booking_fee_configs 
      ADD COLUMN propertyType ENUM('rent', 'sale', 'shortlet', 'hotel') NULL 
      COMMENT 'Property type this fee applies to. Null means applies to all types'
      AFTER feeType
    `);
    console.log('✅ propertyType column added');

    // Modify feeType enum to include new values
    console.log('📝 Updating feeType enum...');
    await sequelize.query(`
      ALTER TABLE booking_fee_configs 
      MODIFY COLUMN feeType ENUM('service_fee', 'tax', 'platform_fee', 'agency_fee', 'damage_fee') NOT NULL 
      COMMENT 'Type of fee: service_fee, tax, platform_fee, agency_fee, or damage_fee'
    `);
    console.log('✅ feeType enum updated');

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Added propertyType column (rent, sale, shortlet, hotel)');
    console.log('   - Updated feeType enum (added agency_fee, damage_fee)');
    console.log('');
    console.log('🎉 You can now create property-specific fee configurations!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('Duplicate column')) {
      console.log('ℹ️  Column already exists - migration may have already run');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

migrateBookingFees();
