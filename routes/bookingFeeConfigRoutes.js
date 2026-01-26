import express from 'express';
import {
    getActiveFees,
    getAllFees,
    createFee,
    updateFee,
    deleteFee
} from '../controllers/bookingFeeConfigController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/booking-fees
 * @desc    Get all active booking fees (public)
 * @access  Public
 */
router.get('/', getActiveFees);

/**
 * @route   GET /api/booking-fees/all
 * @desc    Get all booking fees including inactive (admin only)
 * @access  Private/Admin
 */
router.get('/all', authenticateToken, requireRole('admin'), getAllFees);

/**
 * @route   POST /api/booking-fees
 * @desc    Create new fee configuration
 * @access  Private/Admin
 */
router.post('/', authenticateToken, requireRole('admin'), createFee);

/**
 * @route   PUT /api/booking-fees/:id
 * @desc    Update fee configuration
 * @access  Private/Admin
 */
router.put('/:id', authenticateToken, requireRole('admin'), updateFee);

/**
 * @route   DELETE /api/booking-fees/:id
 * @desc    Delete fee configuration
 * @access  Private/Admin
 */
router.delete('/:id', authenticateToken, requireRole('admin'), deleteFee);

export default router;
