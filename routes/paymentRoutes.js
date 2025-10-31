import express from 'express';
import {
  initializeBookingPaymentController,
  verifyPaymentController,
  handlePaystackWebhookController,
  initiatePayoutController,
  listBanksController,
  verifyBankAccountController
} from '../controllers/paymentController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  initializePaymentValidation,
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

router.post(
  '/verify',
  authenticateToken,
  verifyPaymentValidation,
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


