import sequelize from '../database/db.js';
import { QueryTypes } from 'sequelize';

const addPushTokenColumn = async () => {
  try {
    console.log('🔧 Adding pushToken column to Users table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'Users' 
       AND COLUMN_NAME = 'pushToken'`,
      { type: QueryTypes.SELECT }
    );
    
    if (results && results.length > 0) {
      console.log('⚠️ pushToken column already exists in Users table');
      return;
    }
    
    // Add the column
    await sequelize.query(`
      ALTER TABLE Users 
      ADD COLUMN pushToken VARCHAR(500) NULL 
      COMMENT 'Firebase/Expo push notification token for the device'
    `);
    
    console.log('✅ Successfully added pushToken column to Users table');
    
  } catch (error) {
    console.error('❌ Error adding pushToken column:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the migration
addPushTokenColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

