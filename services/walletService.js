import axios from 'axios';
import crypto from 'crypto';
import Wallet from '../schema/Wallet.js';
import { User } from '../schema/index.js';
import WalletTransaction from '../schema/WalletTransaction.js';
import sequelize from '../database/db.js';

class WalletService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.paystackBaseUrl = 'https://api.paystack.co';
  }

  async createWallet(userId) {
    console.log('🔍 [WALLET SERVICE] createWallet called for userId:', userId);
    try {
      const existingWallet = await Wallet.findOne({ where: { userId } });
      if (existingWallet) {
        console.log(`✅ [WALLET SERVICE] Wallet already exists for user ${userId}`);
        return existingWallet;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let paystackCustomer = null;
      let dedicatedAccount = null;

      try {
        paystackCustomer = await this.createPaystackCustomer(user);
        console.log(`✅ [WALLET SERVICE] Paystack customer created`);

        try {
          dedicatedAccount = await this.createDedicatedVirtualAccount(paystackCustomer.customer_code, user);
          console.log(`✅ [WALLET SERVICE] DVA created`);
        } catch (dvaError) {
          console.warn('⚠️ [WALLET SERVICE] DVA creation failed:', dvaError.message);
        }
      } catch (paystackError) {
        console.warn('⚠️ [WALLET SERVICE] Paystack customer creation failed');
      }

      const walletId = crypto.randomUUID();
      const walletAddress = this.generateWalletAddress(user.firstName, user.lastName, walletId);

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
        availableBalance: 0.00,
        pendingBalance: 0.00,
        currency: 'NGN',
        status: 'active',
        metadata: {
          paystackEmail: user.email,
          createdVia: 'auth_service',
          dvaDetails: dedicatedAccount || null
        }
      });

      console.log(`✅ [WALLET SERVICE] Wallet created successfully`);
      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error creating wallet:', error);
      throw error;
    }
  }

  async createPaystackCustomer(user) {
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
        metadata: { userId: user.id, role: user.role }
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
    }
    throw new Error('Invalid response from Paystack');
  }

  async createDedicatedVirtualAccount(customerCode, user) {
    if (!this.paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const response = await axios.post(
      `${this.paystackBaseUrl}/dedicated_account`,
      {
        customer: customerCode,
        preferred_bank: 'wema-bank',
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
    }
    throw new Error('Invalid response from Paystack DVA API');
  }

  async getOrCreateWallet(userId) {
    try {
      let wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        wallet = await this.createWallet(userId);
      }
      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error getting or creating wallet:', error);
      throw error;
    }
  }

  async getWalletByUserId(userId) {
    try {
      const wallet = await Wallet.findOne({
        where: { userId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }]
      });
      return wallet;
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error getting wallet:', error);
      throw error;
    }
  }

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

  async activateWallet(userId) {
    try {
      const wallet = await Wallet.findOne({ where: { userId } });
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      await wallet.update({ status: 'active' });
      return wallet;
    } catch (error) {
      console.error('❌ Error activating wallet:', error);
      throw error;
    }
  }

  generateWalletAddress(firstName, lastName, walletId) {
    const sanitizeName = (name) => {
      return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    };
    const username = `${sanitizeName(firstName)}${sanitizeName(lastName)}`;
    const shortId = walletId.split('-')[0];
    return `paystack/awari/${username}-${shortId}`;
  }

  async fundWallet(userId, amount, paystackReference, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      const balanceBefore = parseFloat(wallet.balance);
      const fundAmount = parseFloat(amount);
      const balanceAfter = balanceBefore + fundAmount;
      const reference = `FUND-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'credit',
        amount: fundAmount,
        balanceBefore,
        balanceAfter,
        reference,
        description: `Wallet funding via Paystack`,
        status: 'completed',
        paymentMethod: 'paystack',
        paystackReference,
        metadata
      }, { transaction });

      await wallet.update({
        balance: balanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Wallet funded: ${fundAmount} NGN for user ${userId}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error funding wallet:', error);
      throw error;
    }
  }

  async makePayment(userId, amount, description, bookingId = null, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      const balanceBefore = parseFloat(wallet.balance);
      const paymentAmount = parseFloat(amount);

      if (balanceBefore < paymentAmount) {
        throw new Error('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - paymentAmount;
      const reference = `PAY-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'debit',
        amount: paymentAmount,
        balanceBefore,
        balanceAfter,
        reference,
        description,
        status: 'completed',
        paymentMethod: 'wallet',
        bookingId,
        metadata
      }, { transaction });

      await wallet.update({
        balance: balanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Payment made: ${paymentAmount} NGN from user ${userId}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error making payment:', error);
      throw error;
    }
  }

  async processRefund(userId, amount, description, originalTransactionId = null, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);
      const balanceBefore = parseFloat(wallet.availableBalance);
      const refundAmount = parseFloat(amount);
      const balanceAfter = balanceBefore + refundAmount;
      const reference = `REFUND-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'refund',
        amount: refundAmount,
        balanceBefore,
        balanceAfter,
        reference,
        description,
        status: 'completed',
        paymentMethod: 'wallet',
        relatedTransactionId: originalTransactionId,
        metadata
      }, { transaction });

      await wallet.update({
        availableBalance: balanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Refund processed: ${refundAmount} NGN to user ${userId}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error processing refund:', error);
      throw error;
    }
  }

  async requestWithdrawal(userId, amount, bankDetails, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      const balanceBefore = parseFloat(wallet.balance);
      const withdrawalAmount = parseFloat(amount);

      if (balanceBefore < withdrawalAmount) {
        throw new Error('Insufficient wallet balance');
      }

      const balanceAfter = balanceBefore - withdrawalAmount;
      const reference = `WD-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'withdrawal',
        amount: withdrawalAmount,
        balanceBefore,
        balanceAfter,
        reference,
        description: `Withdrawal to ${bankDetails.bankName} - ${bankDetails.accountNumber}`,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        metadata: { ...metadata, bankDetails }
      }, { transaction });

      await wallet.update({
        balance: balanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Withdrawal requested: ${withdrawalAmount} NGN for user ${userId}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error requesting withdrawal:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId, options = {}) {
    try {
      const { limit = 20, offset = 0, type = null, status = null } = options;
      const where = { userId };
      if (type) where.type = type;
      if (status) where.status = status;

      const { count, rows } = await WalletTransaction.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        transactions: rows,
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      };
    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      throw error;
    }
  }

  async transferBetweenWallets(fromUserId, toUserId, amount, description = 'Wallet transfer') {
    const transaction = await sequelize.transaction();

    try {
      const fromWallet = await this.getOrCreateWallet(fromUserId);
      const toWallet = await this.getOrCreateWallet(toUserId);

      if (fromWallet.status !== 'active' || toWallet.status !== 'active') {
        throw new Error('One or both wallets are not active');
      }

      const transferAmount = parseFloat(amount);
      const fromBalanceBefore = parseFloat(fromWallet.balance);

      if (fromBalanceBefore < transferAmount) {
        throw new Error('Insufficient wallet balance');
      }

      const fromBalanceAfter = fromBalanceBefore - transferAmount;
      const toBalanceBefore = parseFloat(toWallet.balance);
      const toBalanceAfter = toBalanceBefore + transferAmount;
      const reference = `TRF-${Date.now()}-${fromUserId.substring(0, 8)}`;

      const debitTxn = await WalletTransaction.create({
        walletId: fromWallet.id,
        userId: fromUserId,
        type: 'transfer_out',
        amount: transferAmount,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromBalanceAfter,
        reference: `${reference}-OUT`,
        description: `${description} to ${toUserId}`,
        status: 'completed',
        paymentMethod: 'wallet',
        metadata: { recipientUserId: toUserId }
      }, { transaction });

      const creditTxn = await WalletTransaction.create({
        walletId: toWallet.id,
        userId: toUserId,
        type: 'transfer_in',
        amount: transferAmount,
        balanceBefore: toBalanceBefore,
        balanceAfter: toBalanceAfter,
        reference: `${reference}-IN`,
        description: `${description} from ${fromUserId}`,
        status: 'completed',
        paymentMethod: 'wallet',
        relatedTransactionId: debitTxn.id,
        metadata: { senderUserId: fromUserId }
      }, { transaction });

      await fromWallet.update({
        balance: fromBalanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await toWallet.update({
        balance: toBalanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Transfer completed: ${transferAmount} NGN from ${fromUserId} to ${toUserId}`);
      return { debitTxn, creditTxn };
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error transferring between wallets:', error);
      throw error;
    }
  }

  /**
   * Credit pending balance (locked until release date)
   * Used when booking payment is received
   */
  async creditPending(userId, amount, bookingId, releaseDate, metadata = {}) {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.status !== 'active') {
        throw new Error('Wallet is not active');
      }

      const creditAmount = parseFloat(amount);
      const availableBalanceBefore = parseFloat(wallet.availableBalance);
      const pendingBalanceBefore = parseFloat(wallet.pendingBalance);
      const pendingBalanceAfter = pendingBalanceBefore + creditAmount;
      const totalBalanceBefore = availableBalanceBefore + pendingBalanceBefore;
      const totalBalanceAfter = availableBalanceBefore + pendingBalanceAfter;

      const reference = `PENDING-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'credit',
        amount: creditAmount,
        balanceBefore: totalBalanceBefore,
        balanceAfter: totalBalanceAfter,
        availableBalanceBefore,
        availableBalanceAfter: availableBalanceBefore, // No change
        pendingBalanceBefore,
        pendingBalanceAfter,
        releaseDate,
        reference,
        description: `Booking payment (pending release on ${releaseDate})`,
        status: 'pending',
        paymentMethod: 'paystack',
        bookingId,
        metadata: {
          ...metadata,
          type: 'booking_payment',
          releaseDate
        }
      }, { transaction });

      await wallet.update({
        pendingBalance: pendingBalanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Pending balance credited: ${creditAmount} NGN for user ${userId}, release: ${releaseDate}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error crediting pending balance:', error);
      throw error;
    }
  }

  /**
   * Debit pending balance (for cancellations/refunds)
   */
  async debitPending(userId, amount, bookingId, reason = 'Booking cancelled') {
    const transaction = await sequelize.transaction();

    try {
      const wallet = await this.getOrCreateWallet(userId);

      const debitAmount = parseFloat(amount);
      const availableBalanceBefore = parseFloat(wallet.availableBalance);
      const pendingBalanceBefore = parseFloat(wallet.pendingBalance);

      if (pendingBalanceBefore < debitAmount) {
        throw new Error('Insufficient pending balance');
      }

      const pendingBalanceAfter = pendingBalanceBefore - debitAmount;
      const totalBalanceBefore = availableBalanceBefore + pendingBalanceBefore;
      const totalBalanceAfter = availableBalanceBefore + pendingBalanceAfter;

      const reference = `PENDING-DEBIT-${Date.now()}-${userId.substring(0, 8)}`;

      const txn = await WalletTransaction.create({
        walletId: wallet.id,
        userId,
        type: 'debit',
        amount: debitAmount,
        balanceBefore: totalBalanceBefore,
        balanceAfter: totalBalanceAfter,
        availableBalanceBefore,
        availableBalanceAfter: availableBalanceBefore, // No change
        pendingBalanceBefore,
        pendingBalanceAfter,
        reference,
        description: reason,
        status: 'completed',
        paymentMethod: 'wallet',
        bookingId,
        metadata: {
          type: 'pending_refund',
          reason
        }
      }, { transaction });

      await wallet.update({
        pendingBalance: pendingBalanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      await transaction.commit();
      console.log(`✅ Pending balance debited: ${debitAmount} NGN from user ${userId}`);
      return txn;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error debiting pending balance:', error);
      throw error;
    }
  }

  /**
   * Release pending balance to available (on check-in date)
   */
  async releasePending(bookingId) {
    const transaction = await sequelize.transaction();

    try {
      // Import Booking model dynamically to avoid circular dependency
      const { default: Booking } = await import('../schema/Booking.js');

      const booking = await Booking.findByPk(bookingId, { transaction });
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.walletStatus !== 'pending') {
        throw new Error(`Cannot release: wallet status is ${booking.walletStatus}`);
      }

      const originalTxn = await WalletTransaction.findByPk(
        booking.walletTransactionId,
        { transaction }
      );

      if (!originalTxn) {
        throw new Error('Original wallet transaction not found');
      }

      const wallet = await Wallet.findByPk(originalTxn.walletId, { transaction });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const releaseAmount = parseFloat(originalTxn.amount);
      const availableBalanceBefore = parseFloat(wallet.availableBalance);
      const pendingBalanceBefore = parseFloat(wallet.pendingBalance);
      const availableBalanceAfter = availableBalanceBefore + releaseAmount;
      const pendingBalanceAfter = pendingBalanceBefore - releaseAmount;
      const totalBalance = availableBalanceAfter + pendingBalanceAfter;

      // Create release transaction
      const reference = `RELEASE-${Date.now()}-${booking.ownerId.substring(0, 8)}`;

      await WalletTransaction.create({
        walletId: wallet.id,
        userId: booking.ownerId,
        type: 'transfer_in',
        amount: releaseAmount,
        balanceBefore: totalBalance,
        balanceAfter: totalBalance,
        availableBalanceBefore,
        availableBalanceAfter,
        pendingBalanceBefore,
        pendingBalanceAfter,
        reference,
        description: `Pending funds released for booking ${bookingId}`,
        status: 'completed',
        paymentMethod: 'wallet',
        bookingId,
        relatedTransactionId: originalTxn.id,
        metadata: {
          type: 'pending_release',
          originalTransactionId: originalTxn.id
        }
      }, { transaction });

      // Update wallet balances
      await wallet.update({
        availableBalance: availableBalanceAfter,
        pendingBalance: pendingBalanceAfter,
        lastTransactionAt: new Date()
      }, { transaction });

      // Update original transaction status
      await originalTxn.update({ status: 'completed' }, { transaction });

      // Update booking wallet status
      await booking.update({ walletStatus: 'released' }, { transaction });

      await transaction.commit();
      console.log(`✅ Pending balance released: ${releaseAmount} NGN for booking ${bookingId}`);
      return wallet;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error releasing pending balance:', error);
      throw error;
    }
  }

  /**
   * Get pending balance breakdown for a user
   */
  async getPendingBalance(userId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      // Get pending transactions
      const pendingTransactions = await WalletTransaction.findAll({
        where: {
          userId,
          status: 'pending',
          type: 'credit'
        },
        order: [['releaseDate', 'ASC']],
        include: [{
          model: Booking,
          as: 'booking',
          attributes: ['id', 'checkInDate', 'propertyId']
        }]
      });

      return {
        totalPending: parseFloat(wallet.pendingBalance),
        totalAvailable: parseFloat(wallet.availableBalance),
        pendingTransactions: pendingTransactions.map(txn => ({
          amount: parseFloat(txn.amount),
          releaseDate: txn.releaseDate,
          bookingId: txn.bookingId,
          description: txn.description
        }))
      };
    } catch (error) {
      console.error('❌ Error getting pending balance:', error);
      throw error;
    }
  }
}

export default new WalletService();
