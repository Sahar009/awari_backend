import WalletTransaction from './schema/WalletTransaction.js';

async function runMigration() {
  try {
    console.log('🔧 Creating wallet_transactions table using Sequelize sync...');
    
    // Use Sequelize sync to create the table with proper foreign key constraints
    await WalletTransaction.sync({ force: false });
    
    console.log('✅ wallet_transactions table created successfully');
    console.log('🎉 Migration completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

runMigration();
