import axios from 'axios';
import Wallet from './schema/Wallet.js';
import { User } from './schema/index.js';
import { Op } from 'sequelize';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

async function createDedicatedVirtualAccount(customerCode, user) {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    console.log(`🔍 Creating DVA for customer: ${customerCode}`);

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/dedicated_account`,
      {
        customer: customerCode,
        preferred_bank: 'wema-bank',
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone || undefined
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Invalid response from Paystack DVA API');
    }
  } catch (error) {
    if (error.response?.data) {
      console.error('Paystack DVA API error:', error.response.data);
      throw new Error(error.response.data.message || 'Failed to create dedicated virtual account');
    }
    throw error;
  }
}

async function updateWalletsWithDVA() {
  try {
    console.log('🔧 Updating existing wallets with Paystack DVA...');
    
    // Find all wallets without account numbers
    const wallets = await Wallet.findAll({
      where: {
        accountNumber: null,
        paystackCustomerCode: {
          [Op.ne]: null
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'phone', 'email']
      }]
    });
    
    console.log(`📋 Found ${wallets.length} wallets without DVA`);
    
    for (const wallet of wallets) {
      if (wallet.user && wallet.paystackCustomerCode) {
        try {
          console.log(`\n🔍 Processing wallet for ${wallet.user.email}...`);
          
          const dedicatedAccount = await createDedicatedVirtualAccount(
            wallet.paystackCustomerCode,
            wallet.user
          );
          
          await wallet.update({
            accountNumber: dedicatedAccount.account_number,
            accountName: dedicatedAccount.account_name,
            bankName: dedicatedAccount.bank.name,
            bankCode: dedicatedAccount.bank.code,
            metadata: {
              ...wallet.metadata,
              dvaDetails: dedicatedAccount
            }
          });
          
          console.log(`✅ Updated wallet with DVA:`, {
            accountNumber: dedicatedAccount.account_number,
            bankName: dedicatedAccount.bank.name,
            accountName: dedicatedAccount.account_name
          });
        } catch (error) {
          console.error(`❌ Failed to create DVA for wallet ${wallet.id}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Wallet DVA update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating wallets:', error);
    process.exit(1);
  }
}

updateWalletsWithDVA();
