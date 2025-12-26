import express from 'express';
import paystackWebhookController from '../controllers/paystackWebhookController.js';

const router = express.Router();

/**
 * @route   POST /api/paystack/webhook
 * @desc    Handle Paystack webhook events
 * @access  Public (verified by signature)
 */
router.post('/webhook', paystackWebhookController.handleWebhook);

export default router;
