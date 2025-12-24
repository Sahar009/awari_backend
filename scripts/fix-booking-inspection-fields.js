import sequelize from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

const fixBookingInspectionFields = async () => {
  try {
    console.log('🔧 Starting database schema fix for Booking inspection fields...');
    
    // Change inspectionDate from DATETIME to DATE
    await sequelize.query(`
      ALTER TABLE Bookings 
      MODIFY COLUMN inspectionDate DATE NULL;
    `);
    console.log('✅ Changed inspectionDate to DATE type');
    
    // Change inspectionTime from TIME to VARCHAR(5)
    await sequelize.query(`
      ALTER TABLE Bookings 
      MODIFY COLUMN inspectionTime VARCHAR(5) NULL;
    `);
    console.log('✅ Changed inspectionTime to VARCHAR(5) type');
    
    console.log('✅ Database schema fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database schema fix failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
};

fixBookingInspectionFields();
