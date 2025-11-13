import express from 'express';
import {
  getEarningsSummary,
  getPaymentLogs,
  getInspectionSchedule,
  getBookingRequests,
  respondToBookingRequest,
  getClientInquiries,
  archiveInquiry
} from '../controllers/landlordDashboardController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  earningsSummaryValidation,
  paymentLogsValidation,
  inspectionScheduleValidation,
  bookingRequestsValidation,
  respondBookingRequestValidation,
  clientInquiriesValidation,
  archiveInquiryValidation
} from '../validations/landlordDashboardValidation.js';
import { validationResult } from 'express-validator';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return next();
};

router.use(authenticateToken, requireRole('landlord', 'agent'));

router.get(
  '/earnings',
  earningsSummaryValidation,
  handleValidationErrors,
  getEarningsSummary
);

router.get(
  '/payments',
  paymentLogsValidation,
  handleValidationErrors,
  getPaymentLogs
);

router.get(
  '/inspection-schedule',
  inspectionScheduleValidation,
  handleValidationErrors,
  getInspectionSchedule
);

router.get(
  '/booking-requests',
  bookingRequestsValidation,
  handleValidationErrors,
  getBookingRequests
);

router.put(
  '/booking-requests/:bookingId/respond',
  respondBookingRequestValidation,
  handleValidationErrors,
  respondToBookingRequest
);

router.get(
  '/inquiries',
  clientInquiriesValidation,
  handleValidationErrors,
  getClientInquiries
);

router.put(
  '/inquiries/:messageId/archive',
  archiveInquiryValidation,
  handleValidationErrors,
  archiveInquiry
);

export default router;



