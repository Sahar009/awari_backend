import sequelize from '../database/db.js';

/**
 * Fix notifications table collation to match other tables (utf8mb4_unicode_ci)
 * Only modify the text columns that are causing the collation mismatch
 */
const fixCollation = async () => {
  try {
    console.log('🔧 Fixing notifications table collation...\n');

    console.log('Modifying text columns to utf8mb4_unicode_ci...');
    await sequelize.query(`
      ALTER TABLE notifications 
        MODIFY COLUMN title VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN priority VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN actionUrl VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        MODIFY COLUMN actionText VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ Success\n');

    console.log('✅ Notifications table collation fixed successfully!');
    console.log('🎉 You can now run the test notification script again.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing collation:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

fixCollation();
