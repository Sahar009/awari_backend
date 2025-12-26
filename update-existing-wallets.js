import sequelize from './database/db.js';
import Wallet from './schema/Wallet.js';
import { User } from './schema/index.js';
import crypto from 'crypto';

// Helper function to generate wallet address
function generateWalletAddress(firstName, lastName, walletId) {
  const sanitizeName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
  };

  const username = `${sanitizeName(firstName)}${sanitizeName(lastName)}`;
  const shortId = walletId.split('-')[0];
  return `paystack/awari/${username}-${shortId}`;
}

async function updateExistingWallets() {
  try {
    console.log('🔧 Updating existing wallets with wallet addresses...');
    
    // Find all wallets without wallet addresses
    const wallets = await Wallet.findAll({
      where: {
        walletAddress: null
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }]
    });
    
    console.log(`📋 Found ${wallets.length} wallets without addresses`);
    
    for (const wallet of wallets) {
      if (wallet.user) {
        const walletAddress = generateWalletAddress(
          wallet.user.firstName,
          wallet.user.lastName,
          wallet.id
        );
        
        await wallet.update({ walletAddress });
        console.log(`✅ Updated wallet ${wallet.id} with address: ${walletAddress}`);
      }
    }
    
    console.log('🎉 All existing wallets updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating wallets:', error);
    process.exit(1);
  }
}

updateExistingWallets();
