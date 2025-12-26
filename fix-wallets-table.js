import sequelize from './database/db.js';
import Wallet from './schema/Wallet.js';

async function fixWalletsTable() {
  try {
    console.log('🔧 Starting wallets table fix...');
    
    // Drop the existing wallets table with the wrong foreign key
    console.log('📋 Dropping existing wallets table...');
    await sequelize.query('DROP TABLE IF EXISTS `wallets`;');
    console.log('✅ Wallets table dropped');
    
    // Force sync the Wallet model to recreate the table with correct foreign key
    console.log('📋 Creating wallets table with correct foreign key...');
    await Wallet.sync({ force: true });
    console.log('✅ Wallets table created successfully with correct foreign key to Users table');
    
    console.log('🎉 Wallets table fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing wallets table:', error);
    process.exit(1);
  }
}

fixWalletsTable();
