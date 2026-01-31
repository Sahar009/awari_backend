import sequelize from '../database/db.js';

/**
 * Fix messages table foreign key constraint to reference correct Users table
 */
const fixMessagesForeignKey = async () => {
  try {
    console.log('🔧 Fixing messages table foreign key constraints...\n');

    // Drop existing foreign key constraints
    console.log('1. Dropping existing foreign key constraints...');
    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_1');
      console.log('   ✅ Dropped messages_ibfk_1 (senderId)');
    } catch (e) {
      console.log('   ⚠️  messages_ibfk_1 not found or already dropped');
    }

    try {
      await sequelize.query('ALTER TABLE messages DROP FOREIGN KEY messages_ibfk_2');
      console.log('   ✅ Dropped messages_ibfk_2 (receiverId)');
    } catch (e) {
      console.log('   ⚠️  messages_ibfk_2 not found or already dropped');
    }

    // Re-add foreign key constraints with correct table name (Users with capital U)
    console.log('\n2. Adding new foreign key constraints with correct table reference...');
    
    await sequelize.query(`
      ALTER TABLE messages
      ADD CONSTRAINT messages_ibfk_1 
      FOREIGN KEY (senderId) 
      REFERENCES Users(id) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log('   ✅ Added messages_ibfk_1 (senderId -> Users)');

    await sequelize.query(`
      ALTER TABLE messages
      ADD CONSTRAINT messages_ibfk_2 
      FOREIGN KEY (receiverId) 
      REFERENCES Users(id) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log('   ✅ Added messages_ibfk_2 (receiverId -> Users)');

    console.log('\n✅ Messages table foreign key constraints fixed successfully!');
    console.log('🎉 You can now send messages without foreign key errors.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing foreign key constraints:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

fixMessagesForeignKey();
