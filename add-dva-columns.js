import sequelize from './database/db.js';

async function addDVAColumns() {
  try {
    console.log('🔧 Adding Paystack DVA columns to wallets table...');
    
    // Add DVA columns
    await sequelize.query(`
      ALTER TABLE wallets 
      ADD COLUMN accountNumber VARCHAR(255) NULL COMMENT 'Paystack dedicated virtual account number',
      ADD COLUMN accountName VARCHAR(255) NULL COMMENT 'Paystack dedicated virtual account name',
      ADD COLUMN bankName VARCHAR(255) NULL COMMENT 'Bank name for the dedicated virtual account',
      ADD COLUMN bankCode VARCHAR(255) NULL COMMENT 'Bank code for the dedicated virtual account';
    `);
    
    console.log('✅ DVA columns added successfully');
    console.log('🎉 Database update completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding DVA columns:', error);
    process.exit(1);
  }
}

addDVAColumns();
