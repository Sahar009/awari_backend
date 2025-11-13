import express from 'express';
import * as userDashboardController from '../controllers/userDashboardController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { query, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules
const getDashboardDataValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired']).withMessage('Invalid status'),
  query('paymentStatus').optional().isIn(['pending', 'partial', 'completed', 'failed', 'refunded']).withMessage('Invalid payment status'),
  query('sortBy').optional().isString().withMessage('SortBy must be a string'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('SortOrder must be ASC or DESC')
];

/**
 * @swagger
 * /api/user-dashboard/rentals:
 *   get:
 *     summary: Get user's rental applications
 *     tags: [User Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, rejected, expired]
 *     responses:
 *       200:
 *         description: Rental applications retrieved successfully
 */
router.get('/rentals',
  authenticateToken,
  getDashboardDataValidation,
  handleValidationErrors,
  userDashboardController.getMyRentals
);

/**
 * @swagger
 * /api/user-dashboard/purchases:
 *   get:
 *     summary: Get user's purchase data (inspections and viewed properties)
 *     tags: [User Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchase data retrieved successfully
 */
router.get('/purchases',
  authenticateToken,
  getDashboardDataValidation,
  handleValidationErrors,
  userDashboardController.getMyPurchases
);

/**
 * @swagger
 * /api/user-dashboard/shortlets:
 *   get:
 *     summary: Get user's shortlet bookings
 *     tags: [User Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shortlet bookings retrieved successfully
 */
router.get('/shortlets',
  authenticateToken,
  getDashboardDataValidation,
  handleValidationErrors,
  userDashboardController.getMyShortletBookings
);

/**
 * @swagger
 * /api/user-dashboard/payment-statements:
 *   get:
 *     summary: Get user's payment statements
 *     tags: [User Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statements retrieved successfully
 */
router.get('/payment-statements',
  authenticateToken,
  getDashboardDataValidation,
  handleValidationErrors,
  userDashboardController.getPaymentStatements
);

/**
 * @swagger
 * /api/user-dashboard/stats:
 *   get:
 *     summary: Get user dashboard statistics
 *     tags: [User Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/stats',
  authenticateToken,
  userDashboardController.getDashboardStats
);

export default router;


