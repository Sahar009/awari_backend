import crypto from 'crypto';
import walletService from '../services/walletService.js';

class PaystackWebhookController {
  /**
   * Handle Paystack webhook events
   * This endpoint receives notifications from Paystack when payments are successful
   */
  async handleWebhook(req, res) {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        console.error('❌ Invalid webhook signature');
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      const event = req.body;
      console.log('📥 Paystack webhook received:', event.event);

      // Handle charge.success event (payment successful)
      if (event.event === 'charge.success') {
        const { reference, amount, customer, metadata } = event.data;

        // Check if this is a wallet funding transaction
        const isWalletFunding = metadata?.custom_fields?.some(
          field => field.variable_name === 'wallet_funding' && field.value === 'true'
        );

        if (isWalletFunding) {
          console.log('💰 Processing wallet funding:', {
            reference,
            amount: amount / 100, // Convert from kobo to naira
            email: customer.email
          });

          // The wallet will be credited via the /api/wallet/fund endpoint
          // This webhook is just for logging and verification
          console.log('✅ Wallet funding payment verified via webhook');
        }
      }

      // Respond to Paystack immediately
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }
}

export default new PaystackWebhookController();
