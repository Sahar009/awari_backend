import sequelize from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

const fixBookingForeignKeys = async () => {
  try {
    console.log('🔧 Fixing Bookings table foreign key constraints...');
    
    // Drop existing foreign key constraints
    console.log('📋 Dropping old foreign key constraints...');
    
    try {
      await sequelize.query(`
        ALTER TABLE bookings 
        DROP FOREIGN KEY bookings_ibfk_1;
      `);
      console.log('✅ Dropped bookings_ibfk_1 (propertyId)');
    } catch (e) {
      console.log('⚠️ bookings_ibfk_1 might not exist:', e.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE bookings 
        DROP FOREIGN KEY bookings_ibfk_2;
      `);
      console.log('✅ Dropped bookings_ibfk_2 (userId)');
    } catch (e) {
      console.log('⚠️ bookings_ibfk_2 might not exist:', e.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE bookings 
        DROP FOREIGN KEY bookings_ibfk_3;
      `);
      console.log('✅ Dropped bookings_ibfk_3 (ownerId)');
    } catch (e) {
      console.log('⚠️ bookings_ibfk_3 might not exist:', e.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE bookings 
        DROP FOREIGN KEY bookings_ibfk_4;
      `);
      console.log('✅ Dropped bookings_ibfk_4 (cancelledBy)');
    } catch (e) {
      console.log('⚠️ bookings_ibfk_4 might not exist:', e.message);
    }
    
    // Recreate foreign key constraints with correct table names (capitalized)
    console.log('📋 Creating new foreign key constraints with correct table names...');
    
    await sequelize.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_propertyId_fkey 
      FOREIGN KEY (propertyId) REFERENCES properties(id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✅ Created propertyId foreign key');
    
    await sequelize.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_userId_fkey 
      FOREIGN KEY (userId) REFERENCES Users(id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✅ Created userId foreign key (referencing Users table)');
    
    await sequelize.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_ownerId_fkey 
      FOREIGN KEY (ownerId) REFERENCES Users(id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✅ Created ownerId foreign key (referencing Users table)');
    
    await sequelize.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_cancelledBy_fkey 
      FOREIGN KEY (cancelledBy) REFERENCES Users(id) 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✅ Created cancelledBy foreign key (referencing Users table)');
    
    console.log('✅ All foreign key constraints fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix foreign key constraints:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
};

fixBookingForeignKeys();
