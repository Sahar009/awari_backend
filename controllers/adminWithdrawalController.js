import walletService from '../services/walletService.js';
import { WalletTransaction } from '../schema/index.js';
import { Op } from 'sequelize';
import axios from 'axios';
import { sendEmail } from '../modules/notifications/email.js';

class AdminWithdrawalController {
  /**
   * Get all withdrawal requests with filters
   */
  async getWithdrawals(req, res) {
    try {
      console.log('📋 Admin fetching withdrawal requests');
      const { status, page = 1, limit = 50 } = req.query;

      const whereClause = {
        type: 'withdrawal'
      };

      if (status && status !== 'all') {
        whereClause.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { rows: withdrawals, count } = await WalletTransaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: 'wallet',
            include: [
              {
                association: 'user',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      const formattedWithdrawals = withdrawals.map(w => ({
        id: w.id,
        userId: w.wallet?.userId,
        walletId: w.walletId,
        amount: w.amount,
        status: w.status,
        type: w.type,
        description: w.description,
        metadata: w.metadata || {},
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        user: w.wallet?.user ? {
          firstName: w.wallet.user.firstName,
          lastName: w.wallet.user.lastName,
          email: w.wallet.user.email
        } : null
      }));

      console.log(`✅ Found ${count} withdrawal requests`);
      res.status(200).json({
        success: true,
        data: formattedWithdrawals,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('❌ Error fetching withdrawals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawal requests',
        error: error.message
      });
    }
  }

  /**
   * Approve and process withdrawal via Paystack
   */
  async approveWithdrawal(req, res) {
    try {
      const { id } = req.params;
      console.log('✅ Admin approving withdrawal:', id);

      const withdrawal = await WalletTransaction.findOne({
        where: { id },
        include: [
          {
            association: 'wallet',
            include: [{ association: 'user' }]
          }
        ]
      });

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal request not found'
        });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot approve withdrawal with status: ${withdrawal.status}`
        });
      }

      // Update status to processing
      await withdrawal.update({ status: 'processing' });

      // Process transfer via Paystack
      try {
        const metadata = withdrawal.metadata || {};
        const transferData = {
          source: 'balance',
          amount: withdrawal.amount * 100, // Convert to kobo
          recipient: metadata.recipientCode || await this.createTransferRecipient(metadata),
          reason: withdrawal.description || 'Wallet withdrawal'
        };

        console.log('💸 Initiating Paystack transfer:', transferData);

        const response = await axios.post(
          'https://api.paystack.co/transfer',
          transferData,
          {
            headers: {
              'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('📥 Paystack transfer response:', response.data);

        if (response.data.status) {
          // Update withdrawal to completed
          await withdrawal.update({
            status: 'completed',
            metadata: {
              ...metadata,
              transferCode: response.data.data.transfer_code,
              transferId: response.data.data.id,
              processedAt: new Date().toISOString(),
              processedBy: req.user.id
            }
          });


          // Send email notification
          try {
            await sendEmail({
              to: withdrawal.wallet.user.email,
              subject: 'Withdrawal Approved - Funds on the Way! 💰',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Withdrawal Approved!</h2>
                  <p>Dear ${withdrawal.wallet.user.firstName},</p>
                  <p>Great news! Your withdrawal request has been approved and processed.</p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Withdrawal Details:</h3>
                    <p><strong>Amount:</strong> ₦${parseFloat(withdrawal.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    <p><strong>Bank:</strong> ${metadata.bankName}</p>
                    <p><strong>Account:</strong> ${metadata.accountNumber}</p>
                    <p><strong>Account Name:</strong> ${metadata.accountName}</p>
                    <p><strong>Transfer Code:</strong> ${response.data.data.transfer_code}</p>
                  </div>
                  
                  <p>The funds should arrive in your bank account within a few minutes to 24 hours depending on your bank.</p>
                  <p>Thank you for using AWARI!</p>
                  
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 12px;">
                    If you have any questions, please contact our support team.
                  </p>
                </div>
              `
            });
            console.log('✅ Approval email sent to user');
          } catch (emailError) {
            console.error('⚠️ Failed to send approval email:', emailError);
          }

          console.log('✅ Withdrawal processed successfully');
          res.status(200).json({
            success: true,
            message: 'Withdrawal approved and processed successfully',
            data: {
              id: withdrawal.id,
              status: 'completed',
              transferCode: response.data.data.transfer_code
            }
          });
        } else {
          throw new Error(response.data.message || 'Transfer failed');
        }
      } catch (transferError) {
        console.error('❌ Transfer failed:', transferError);
        
        // Update withdrawal to failed
        await withdrawal.update({
          status: 'failed',
          metadata: {
            ...withdrawal.metadata,
            failureReason: transferError.response?.data?.message || transferError.message,
            failedAt: new Date().toISOString()
          }
        });

        // Refund the amount back to wallet
        await walletService.processRefund(
          withdrawal.wallet.userId,
          withdrawal.amount,
          'Withdrawal failed - refund',
          withdrawal.id
        );

        res.status(400).json({
          success: false,
          message: 'Failed to process transfer. Amount has been refunded.',
          error: transferError.response?.data?.message || transferError.message
        });
      }
    } catch (error) {
      console.error('❌ Error approving withdrawal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve withdrawal',
        error: error.message
      });
    }
  }

  /**
   * Create Paystack transfer recipient
   */
  async createTransferRecipient(bankDetails) {
    try {
      const recipientData = {
        type: 'nuban',
        name: bankDetails.accountName,
        account_number: bankDetails.accountNumber,
        bank_code: bankDetails.bankCode,
        currency: 'NGN'
      };

      console.log('👤 Creating Paystack recipient:', recipientData);

      const response = await axios.post(
        'https://api.paystack.co/transferrecipient',
        recipientData,
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status) {
        console.log('✅ Recipient created:', response.data.data.recipient_code);
        return response.data.data.recipient_code;
      } else {
        throw new Error(response.data.message || 'Failed to create recipient');
      }
    } catch (error) {
      console.error('❌ Error creating recipient:', error);
      throw error;
    }
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      console.log('❌ Admin rejecting withdrawal:', id);

      const withdrawal = await WalletTransaction.findOne({
        where: { id },
        include: [
          {
            association: 'wallet',
            include: [{ association: 'user' }]
          }
        ]
      });

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal request not found'
        });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Cannot reject withdrawal with status: ${withdrawal.status}`
        });
      }

      // Update withdrawal to cancelled
      await withdrawal.update({
        status: 'cancelled',
        metadata: {
          ...withdrawal.metadata,
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
          rejectedBy: req.user.id
        }
      });

      // Refund the amount back to wallet
      await walletService.processRefund(
        withdrawal.wallet.userId,
        withdrawal.amount,
        `Withdrawal cancelled: ${reason}`,
        withdrawal.id
      );

      console.log('✅ Withdrawal rejected and refunded');

      // Send email notification
      try {
        await sendEmail({
          to: withdrawal.wallet.user.email,
          subject: 'Withdrawal Request Declined',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Withdrawal Request Declined</h2>
              <p>Dear ${withdrawal.wallet.user.firstName},</p>
              <p>We regret to inform you that your withdrawal request has been declined.</p>
              
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin-top: 0;">Withdrawal Details:</h3>
                <p><strong>Amount:</strong> ₦${parseFloat(withdrawal.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                <p><strong>Reason:</strong> ${reason}</p>
              </div>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0;"><strong>Good News:</strong> The full amount has been refunded to your wallet and is available for use.</p>
              </div>
              
              <p>If you believe this was an error or have questions, please contact our support team.</p>
              <p>Thank you for your understanding.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px;">
                AWARI Support Team
              </p>
            </div>
          `
        });
        console.log('✅ Rejection email sent to user');
      } catch (emailError) {
        console.error('⚠️ Failed to send rejection email:', emailError);
      }

      res.status(200).json({
        success: true,
        message: 'Withdrawal rejected and amount refunded to user wallet',
        data: {
          id: withdrawal.id,
          status: 'cancelled'
        }
      });
    } catch (error) {
      console.error('❌ Error rejecting withdrawal:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject withdrawal',
        error: error.message
      });
    }
  }
}

export default new AdminWithdrawalController();
