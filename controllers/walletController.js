import walletService from '../services/walletService.js';

class WalletController {
  /**
   * Get wallet details
   */
  async getWallet(req, res) {
    try {
      const userId = req.user.id;
      
      const wallet = await walletService.getOrCreateWallet(userId);
      
      const availableBalance = parseFloat(wallet.availableBalance || 0);
      const pendingBalance = parseFloat(wallet.pendingBalance || 0);
      const totalBalance = availableBalance + pendingBalance;
      
      res.status(200).json({
        success: true,
        data: {
          id: wallet.id,
          walletAddress: wallet.walletAddress,
          accountNumber: wallet.accountNumber,
          accountName: wallet.accountName,
          bankName: wallet.bankName,
          bankCode: wallet.bankCode,
          availableBalance,
          pendingBalance,
          totalBalance,
          currency: wallet.currency,
          status: wallet.status,
          lastTransactionAt: wallet.lastTransactionAt
        }
      });
    } catch (error) {
      console.error('Error getting wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get wallet details',
        error: error.message
      });
    }
  }

  /**
   * Fund wallet via Paystack
   */
  async fundWallet(req, res) {
    try {
      console.log('💰 Fund wallet request received');
      console.log('👤 User ID:', req.user?.id);
      console.log('📦 Request body:', req.body);
      
      const userId = req.user.id;
      const { amount, paystackReference, metadata } = req.body;

      if (!amount || amount <= 0) {
        console.log('❌ Invalid amount:', amount);
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (!paystackReference) {
        console.log('❌ Missing Paystack reference');
        return res.status(400).json({
          success: false,
          message: 'Paystack reference is required'
        });
      }

      console.log('✅ Validation passed, calling walletService.fundWallet...');
      const transaction = await walletService.fundWallet(
        userId,
        amount,
        paystackReference,
        metadata
      );

      console.log('✅ Wallet funded successfully:', transaction.id);
      res.status(200).json({
        success: true,
        message: 'Wallet funded successfully',
        data: transaction
      });
    } catch (error) {
      console.error('❌ Error funding wallet:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fund wallet',
        error: error.message
      });
    }
  }

  /**
   * Make payment from wallet
   */
  async makePayment(req, res) {
    try {
      const userId = req.user.id;
      const { amount, description, bookingId, metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (!description) {
        return res.status(400).json({
          success: false,
          message: 'Description is required'
        });
      }

      const transaction = await walletService.makePayment(
        userId,
        amount,
        description,
        bookingId,
        metadata
      );

      res.status(200).json({
        success: true,
        message: 'Payment successful',
        data: transaction
      });
    } catch (error) {
      console.error('Error making payment:', error);
      
      if (error.message === 'Insufficient wallet balance') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  }

  /**
   * Process refund to wallet
   */
  async processRefund(req, res) {
    try {
      const { amount, description, originalTransactionId, userId, metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const transaction = await walletService.processRefund(
        userId,
        amount,
        description || 'Refund',
        originalTransactionId,
        metadata
      );

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: transaction
      });
    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  }

  /**
   * Verify bank account with Paystack
   */
  async verifyAccount(req, res) {
    try {
      console.log('🔍 Verifying bank account');
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(400).json({
          success: false,
          message: 'Account number and bank code are required'
        });
      }

      // Call Paystack API to verify account
      const axios = (await import('axios')).default;
      const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      console.log('📥 Paystack verification response:', response.data);

      if (response.data.status && response.data.data) {
        res.status(200).json({
          success: true,
          data: {
            account_number: response.data.data.account_number,
            account_name: response.data.data.account_name,
            bank_id: response.data.data.bank_id
          }
        });
      } else {
        throw new Error('Could not verify account');
      }
    } catch (error) {
      console.error('❌ Error verifying account:', error);
      res.status(400).json({
        success: false,
        message: error.response?.data?.message || 'Could not verify account. Please check your details.',
        error: error.message
      });
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(req, res) {
    try {
      console.log('💸 Withdrawal request received');
      const userId = req.user.id;
      const { amount, bankDetails, metadata } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankCode) {
        return res.status(400).json({
          success: false,
          message: 'Bank details are required (accountNumber, bankCode, bankName)'
        });
      }

      console.log('✅ Processing withdrawal for user:', userId, 'Amount:', amount);
      const transaction = await walletService.requestWithdrawal(
        userId,
        amount,
        bankDetails,
        metadata
      );

      console.log('✅ Withdrawal request created:', transaction.id);
      res.status(200).json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: transaction
      });
    } catch (error) {
      console.error('❌ Error requesting withdrawal:', error);
      
      if (error.message === 'Insufficient wallet balance') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to request withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit, offset, type, status } = req.query;

      const options = {
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0,
        type: type || null,
        status: status || null
      };

      const result = await walletService.getTransactionHistory(userId, options);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction history',
        error: error.message
      });
    }
  }

  /**
   * Transfer between wallets
   */
  async transferBetweenWallets(req, res) {
    try {
      const fromUserId = req.user.id;
      const { toUserId, amount, description } = req.body;

      if (!toUserId) {
        return res.status(400).json({
          success: false,
          message: 'Recipient user ID is required'
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      if (fromUserId === toUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot transfer to yourself'
        });
      }

      const result = await walletService.transferBetweenWallets(
        fromUserId,
        toUserId,
        amount,
        description
      );

      res.status(200).json({
        success: true,
        message: 'Transfer successful',
        data: result
      });
    } catch (error) {
      console.error('Error transferring between wallets:', error);
      
      if (error.message === 'Insufficient wallet balance') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to transfer',
        error: error.message
      });
    }
  }
}

export default new WalletController();
