import express from 'express';
import walletController from '../controllers/walletController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/wallet
 * @desc    Get wallet details
 * @access  Private
 */
router.get('/', walletController.getWallet);

/**
 * @route   POST /api/wallet/fund
 * @desc    Fund wallet via Paystack
 * @access  Private
 */
router.post('/fund', walletController.fundWallet);

/**
 * @route   POST /api/wallet/pay
 * @desc    Make payment from wallet
 * @access  Private
 */
router.post('/pay', walletController.makePayment);

/**
 * @route   POST /api/wallet/refund
 * @desc    Process refund to wallet (admin/system)
 * @access  Private
 */
router.post('/refund', walletController.processRefund);

/**
 * @route   POST /api/wallet/verify-account
 * @desc    Verify bank account details
 * @access  Private
 */
router.post('/verify-account', walletController.verifyAccount);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Request withdrawal from wallet
 * @access  Private
 */
router.post('/withdraw', walletController.requestWithdrawal);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/transactions', walletController.getTransactionHistory);

/**
 * @route   POST /api/wallet/transfer
 * @desc    Transfer between wallets
 * @access  Private
 */
router.post('/transfer', walletController.transferBetweenWallets);

export default router;
