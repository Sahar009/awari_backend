import express from 'express';
import adminWithdrawalController from '../controllers/adminWithdrawalController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require admin authentication
// TODO: Add admin role check middleware

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawal requests with filters
 * @access  Admin only
 */
router.get('/', authenticateToken, adminWithdrawalController.getWithdrawals);

/**
 * @route   POST /api/admin/withdrawals/:id/approve
 * @desc    Approve and process withdrawal via Paystack
 * @access  Admin only
 */
router.post('/:id/approve', authenticateToken, adminWithdrawalController.approveWithdrawal);

/**
 * @route   POST /api/admin/withdrawals/:id/reject
 * @desc    Reject withdrawal request and refund to wallet
 * @access  Admin only
 */
router.post('/:id/reject', authenticateToken, adminWithdrawalController.rejectWithdrawal);

export default router;
