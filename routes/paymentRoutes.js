import express from 'express';
import {
  initializeBookingPaymentController,
  initializeBookingPaymentWithDataController,
  verifyPaymentController,
  handlePaystackWebhookController,
  initiatePayoutController,
  listBanksController,
  verifyBankAccountController
} from '../controllers/paymentController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  initializePaymentValidation,
  initializePaymentWithDataValidation,
  verifyPaymentValidation,
  initiatePayoutValidation,
  verifyBankAccountValidation
} from '../validations/paymentValidation.js';

const router = express.Router();

router.post(
  '/bookings/:bookingId/initialize',
  authenticateToken,
  initializePaymentValidation,
  initializeBookingPaymentController
);

// New payment-first flow: Initialize payment with booking data (no pre-created booking)
router.post(
  '/initialize-booking',
  authenticateToken,
  initializePaymentWithDataValidation,
  initializeBookingPaymentWithDataController
);

router.post(
  '/verify',
  authenticateToken,
  verifyPaymentValidation,
  verifyPaymentController
);

// GET route for payment verification (used by callback URL)
router.get(
  '/verify/:reference',
  authenticateToken,
  verifyPaymentController
);

router.post(
  '/payouts',
  authenticateToken,
  requireRole('landlord', 'agent', 'hotel_provider', 'admin'),
  initiatePayoutValidation,
  initiatePayoutController
);

router.get('/banks', authenticateToken, listBanksController);

router.post(
  '/banks/verify',
  authenticateToken,
  verifyBankAccountValidation,
  verifyBankAccountController
);

router.post('/paystack/webhook', handlePaystackWebhookController);

export default router;


