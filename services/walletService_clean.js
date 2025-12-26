import axios from 'axios';
import Wallet from '../schema/Wallet.js';
import { User } from '../schema/index.js';

class WalletService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  /**
   * Create Paystack customer and wallet for user
   * @param {string} userId - User ID
   * @returns {Object} Created wallet
   */
  async createWallet(userId) {
    console.log('🔍 [WALLET SERVICE] createWallet called for userId:', userId);
    try {
      // Check if wallet already exists
      console.log('🔍 [WALLET SERVICE] Checking if wallet exists...');
      const existingWallet = await Wallet.findOne({ where: { userId } });
      if (existingWallet) {
        console.log(`✅ [WALLET SERVICE] Wallet already exists for user ${userId}:`, {
          walletId: existingWallet.id,
          balance: existingWallet.balance,
          status: existingWallet.status
        });
        return existingWallet;
      }

      console.log('🔍 [WALLET SERVICE] No existing wallet found, creating new wallet...');

      // Get user details
      console.log('🔍 [WALLET SERVICE] Fetching user details...');
      const user = await User.findByPk(userId);
      if (!user) {
        console.error('❌ [WALLET SERVICE] User not found:', userId);
        throw new Error('User not found');
      }
      console.log('✅ [WALLET SERVICE] User found:', user.email);

      // Create Paystack customer
      let paystackCustomer = null;
      let dedicatedAccount = null;
      
      try {
        console.log('🔍 [WALLET SERVICE] Creating Paystack customer...');
        paystackCustomer = await this.createPaystackCustomer(user);
        console.log(`✅ [WALLET SERVICE] Paystack customer created for ${user.email}:`, paystackCustomer.customer_code);
        
        // Create Dedicated Virtual Account for the customer
        try {
          console.log('🔍 [WALLET SERVICE] Creating Paystack Dedicated Virtual Account...');
          dedicatedAccount = await this.createDedicatedVirtualAccount(paystackCustomer.customer_code, user);
          console.log(`✅ [WALLET SERVICE] DVA created:`, {
            accountNumber: dedicatedAccount.account_number,
            bankName: dedicatedAccount.bank.name
          });
        } catch (dvaError) {
          console.warn('⚠️ [WALLET SERVICE] DVA creation failed:', dvaError.message);
        }
      } catch (paystackError) {
        console.warn('⚠️ [WALLET SERVICE] Paystack customer creation failed, creating wallet without Paystack:', paystackError.message);
      }

      // Generate wallet address
      const walletId = require('crypto').randomUUID();
      const walletAddress = this.generateWalletAddress(user.firstName, user.lastName, walletId);
      console.log('🔍 [WALLET SERVICE] Generated wallet address:', walletAddress);

      // Create wallet in database
      console.log('🔍 [WALLET SERVICE] Creating wallet in database...');
      const wallet = await Wallet.create({
        id: walletId,
        userId,
        paystackCustomerId: paystackCustomer?.id || null,
        paystackCustomerCode: paystackCustomer?.customer_code || null,
        walletAddress: walletAddress,
        accountNumber: dedicatedAccount?.account_number || null,
        accountName: dedicatedAccount?.account_name || null,
        bankName: dedicatedAccount?.bank?.name || null,
        bankCode: dedicatedAccount?.bank?.code || null,
        balance: 0.00,
        currency: 'NGN',
        status: 'active',
        metadata: {
          paystackEmail: user.email,
          createdVia: 'auth_service',
          dvaDetails: dedicatedAccount || null
        }
      });

      console.log(`✅ [WALLET SERVICE] Wallet created successfully:`, {
        walletId: wallet.id,
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        accountNumber: wallet.accountNumber,
        bankName: wallet.bankName,
        balance: wallet.balance,
        status: wallet.status,
        paystackCustomerCode: wallet.paystackCustomerCode
      });
      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error creating wallet:', error);
      console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Create Paystack customer
   * @param {Object} user - User object
   * @returns {Object} Paystack customer data
   */
  async createPaystackCustomer(user) {
    try {
      if (!this.paystackSecretKey) {
        throw new Error('Paystack secret key not configured');
      }

      const response = await axios.post(
        `${this.paystackBaseUrl}/customer`,
        {
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone || undefined,
          metadata: {
            userId: user.id,
            role: user.role
          }
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status && response.data.data) {
        return response.data.data;
      } else {
        throw new Error('Invalid response from Paystack');
      }
    } catch (error) {
      if (error.response?.data) {
        console.error('Paystack API error:', error.response.data);
        throw new Error(error.response.data.message || 'Failed to create Paystack customer');
      }
      throw error;
    }
  }

  /**
   * Get or create wallet for user
   * @param {string} userId - User ID
   * @returns {Object} Wallet
   */
  async getOrCreateWallet(userId) {
    console.log('🔍 [WALLET SERVICE] getOrCreateWallet called for userId:', userId);
    try {
      console.log('🔍 [WALLET SERVICE] Searching for existing wallet...');
      let wallet = await Wallet.findOne({ where: { userId } });
      
      if (!wallet) {
        console.log(`📝 [WALLET SERVICE] No wallet found for user ${userId}, creating new wallet...`);
        wallet = await this.createWallet(userId);
      } else {
        console.log('✅ [WALLET SERVICE] Existing wallet found:', {
          walletId: wallet.id,
          userId: wallet.userId,
          balance: wallet.balance,
          status: wallet.status
        });
      }

      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error getting or creating wallet:', error);
      console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} Wallet or null
   */
  async getWalletByUserId(userId) {
    console.log('🔍 [WALLET SERVICE] getWalletByUserId called for userId:', userId);
    try {
      console.log('🔍 [WALLET SERVICE] Querying wallet with user association...');
      const wallet = await Wallet.findOne({ 
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }]
      });
      
      if (wallet) {
        console.log('✅ [WALLET SERVICE] Wallet found:', {
          walletId: wallet.id,
          userId: wallet.userId,
          balance: wallet.balance,
          status: wallet.status
        });
      } else {
        console.log('⚠️ [WALLET SERVICE] No wallet found for userId:', userId);
      }
      
      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error getting wallet:', error);
      console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Update wallet balance
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} type - 'credit' or 'debit'
   * @returns {Object} Updated wallet
   */
  async updateBalance(userId, amount, type = 'credit') {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      
      const currentBalance = parseFloat(wallet.balance);
      const changeAmount = parseFloat(amount);
      
      let newBalance;
      if (type === 'credit') {
        newBalance = currentBalance + changeAmount;
      } else if (type === 'debit') {
        if (currentBalance < changeAmount) {
          throw new Error('Insufficient wallet balance');
        }
        newBalance = currentBalance - changeAmount;
      } else {
        throw new Error('Invalid transaction type');
      }

      await wallet.update({
        balance: newBalance,
        lastTransactionAt: new Date()
      });

      return wallet;
    } catch (error) {
      console.error('❌ Error updating wallet balance:', error);
      throw error;
    }
  }

  /**
   * Suspend wallet
   * @param {string} userId - User ID
   * @returns {Object} Updated wallet
   */
  async suspendWallet(userId) {
    try {
      const wallet = await this.getWalletByUserId(userId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      await wallet.update({ status: 'suspended' });
      return wallet;
    } catch (error) {
      console.error('❌ Error suspending wallet:', error);
      throw error;
    }
  }

  /**
   * Activate wallet
}
});

console.log(`✅ [WALLET SERVICE] Wallet created successfully:`, {
  walletId: wallet.id,
  userId: wallet.userId,
  walletAddress: wallet.walletAddress,
  balance: wallet.balance,
  status: wallet.status,
  paystackCustomerCode: wallet.paystackCustomerCode
});
return wallet;
} catch (error) {
console.error('❌ [WALLET SERVICE] Error creating wallet:', error);
console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
throw error;
}
}

/**
* Create Paystack customer
* @param {Object} user - User object
* @returns {Object} Paystack customer data
*/
async createPaystackCustomer(user) {
try {
if (!this.paystackSecretKey) {
throw new Error('Paystack secret key not configured');
}

const response = await axios.post(
`${this.paystackBaseUrl}/customer`,
{
email: user.email,
first_name: user.firstName,
last_name: user.lastName,
phone: user.phone || undefined,
metadata: {
userId: user.id,
role: user.role
}
},
{
headers: {
Authorization: `Bearer ${this.paystackSecretKey}`,
'Content-Type': 'application/json'
}
}
);

if (response.data.status && response.data.data) {
return response.data.data;
} else {
throw new Error('Invalid response from Paystack');
}
} catch (error) {
if (error.response?.data) {
console.error('Paystack API error:', error.response.data);
throw new Error(error.response.data.message || 'Failed to create Paystack customer');
}
throw error;
}
}

/**
* Get or create wallet for user
* @param {string} userId - User ID
* @returns {Object} Wallet
*/
async getOrCreateWallet(userId) {
console.log('🔍 [WALLET SERVICE] getOrCreateWallet called for userId:', userId);
try {
console.log('🔍 [WALLET SERVICE] Searching for existing wallet...');
let wallet = await Wallet.findOne({ where: { userId } });
  
if (!wallet) {
console.log(`📝 [WALLET SERVICE] No wallet found for user ${userId}, creating new wallet...`);
wallet = await this.createWallet(userId);
} else {
console.log('✅ [WALLET SERVICE] Existing wallet found:', {
walletId: wallet.id,
userId: wallet.userId,
balance: wallet.balance,
status: wallet.status
});
}

return wallet;
} catch (error) {
console.error('❌ [WALLET SERVICE] Error getting or creating wallet:', error);
console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
throw error;
}
}

/**
* Get wallet by user ID
* @param {string} userId - User ID
* @returns {Object|null} Wallet or null
*/
async getWalletByUserId(userId) {
console.log('🔍 [WALLET SERVICE] getWalletByUserId called for userId:', userId);
try {
console.log('🔍 [WALLET SERVICE] Querying wallet with user association...');
const wallet = await Wallet.findOne({ 
where: { userId },
include: [{
model: User,
as: 'user',
attributes: ['id', 'email', 'firstName', 'lastName']
}]
});
  
if (wallet) {
console.log('✅ [WALLET SERVICE] Wallet found:', {
walletId: wallet.id,
userId: wallet.userId,
balance: wallet.balance,
status: wallet.status
});
} else {
console.log('⚠️ [WALLET SERVICE] No wallet found for userId:', userId);
}
  
return wallet;
} catch (error) {
console.error('❌ [WALLET SERVICE] Error getting wallet:', error);
console.error('❌ [WALLET SERVICE] Error stack:', error.stack);
throw error;
}
}

/**
* Update wallet balance
* @param {string} userId - User ID
* @param {number} amount - Amount to add/subtract
* @param {string} type - 'credit' or 'debit'
* @returns {Object} Updated wallet
*/
async updateBalance(userId, amount, type = 'credit') {
try {
const wallet = await this.getOrCreateWallet(userId);
  
const currentBalance = parseFloat(wallet.balance);
const changeAmount = parseFloat(amount);
  
let newBalance;
if (type === 'credit') {
newBalance = currentBalance + changeAmount;
} else if (type === 'debit') {
if (currentBalance < changeAmount) {
throw new Error('Insufficient wallet balance');
}
newBalance = currentBalance - changeAmount;
} else {
throw new Error('Invalid transaction type');
}

await wallet.update({
balance: newBalance,
lastTransactionAt: new Date()
});

return wallet;
} catch (error) {
console.error('❌ Error updating wallet balance:', error);
throw error;
}
}

/**
* Suspend wallet
* @param {string} userId - User ID
* @returns {Object} Updated wallet
*/
async suspendWallet(userId) {
try {
const wallet = await this.getWalletByUserId(userId);
if (!wallet) {
throw new Error('Wallet not found');
}

await wallet.update({ status: 'suspended' });
return wallet;
} catch (error) {
console.error('❌ Error suspending wallet:', error);
throw error;
}
}

/**
* Activate wallet
* @param {string} userId - User ID
* @returns {Object} Updated wallet
*/
async activateWallet(userId) {
try {
const wallet = await Wallet.findOne({ where: { userId } });
if (!wallet) {
throw new Error('Wallet not found');
}

await wallet.update({ status: 'active' });
console.log(`✅ Wallet activated for user ${userId}`);
return wallet;
} catch (error) {
console.error('❌ Error activating wallet:', error);
throw error;
}
}

/**
* Create Paystack Dedicated Virtual Account (DVA)
* @param {string} customerCode - Paystack customer code
* @param {Object} user - User object
* @returns {Object} Dedicated virtual account data
*/
async createDedicatedVirtualAccount(customerCode, user) {
try {
if (!this.paystackSecretKey) {
throw new Error('Paystack secret key not configured');
}

const response = await axios.post(
`${this.paystackBaseUrl}/dedicated_account`,
{
customer: customerCode,
preferred_bank: 'wema-bank', // or 'titan-paystack'
first_name: user.firstName,
last_name: user.lastName,
phone: user.phone || undefined
},
{
headers: {
Authorization: `Bearer ${this.paystackSecretKey}`,
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

/**
* Generate user-friendly wallet address
* @param {string} firstName - User's first name
* @param {string} lastName - User's last name
* @param {string} walletId - Wallet UUID
* @returns {string} Wallet address (e.g., paystack/awari/johnsmith-a1b2c3d4)
*/
generateWalletAddress(firstName, lastName, walletId) {
// Sanitize and combine names
const sanitizeName = (name) => {
return name
.toLowerCase()
.replace(/[^a-z0-9]/g, '') // Remove special characters
.substring(0, 20); // Limit length
};

const username = `${sanitizeName(firstName)}${sanitizeName(lastName)}`;
  
// Get first 8 characters of wallet ID for uniqueness
const shortId = walletId.split('-')[0];
  
// Format: paystack/awari/username-shortid
return `paystack/awari/${username}-${shortId}`;
}

/**
* Fund wallet via Paystack
* @param {string} userId - User ID
