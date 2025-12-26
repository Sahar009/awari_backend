import sequelize from './database/db.js';

async function addWalletAddressColumn() {
  try {
    console.log('🔧 Adding walletAddress column to wallets table...');
    
    // Add the walletAddress column
    await sequelize.query(`
      ALTER TABLE wallets 
      ADD COLUMN walletAddress VARCHAR(255) UNIQUE NULL 
      COMMENT 'User-friendly wallet address for transfers'
      AFTER paystackCustomerCode;
    `);
    
    console.log('✅ walletAddress column added successfully');
    console.log('🎉 Database update completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding walletAddress column:', error);
    process.exit(1);
  }
}

addWalletAddressColumn();
