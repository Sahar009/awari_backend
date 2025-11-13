import * as landlordDashboardService from '../services/landlordDashboardService.js';

const respond = (res, result) => {
  const statusCode = result?.statusCode || (result?.success ? 200 : 500);
  return res.status(statusCode).json({
    success: result?.success ?? false,
    message: result?.message,
    data: result?.data,
    error: result?.error
  });
};

export const getEarningsSummary = async (req, res) => {
  const landlordId = req.user.id;
  const result = await landlordDashboardService.getEarningsSummary(landlordId, req.query);
  return respond(res, result);
};

export const getPaymentLogs = async (req, res) => {
  const landlordId = req.user.id;
  const result = await landlordDashboardService.getPaymentLogs(landlordId, req.query);
  return respond(res, result);
};

export const getInspectionSchedule = async (req, res) => {
  const landlordId = req.user.id;
  const result = await landlordDashboardService.getInspectionSchedule(landlordId, req.query);
  return respond(res, result);
};

export const getBookingRequests = async (req, res) => {
  const landlordId = req.user.id;
  const result = await landlordDashboardService.getBookingRequests(landlordId, req.query);
  return respond(res, result);
};

export const respondToBookingRequest = async (req, res) => {
  const landlordId = req.user.id;
  const { bookingId } = req.params;
  const { action, ownerNotes } = req.body;

  const result = await landlordDashboardService.respondToBookingRequest(
    landlordId,
    bookingId,
    action,
    ownerNotes
  );

  return respond(res, result);
};

export const getClientInquiries = async (req, res) => {
  const landlordId = req.user.id;
  const result = await landlordDashboardService.getClientInquiries(landlordId, req.query);
  return respond(res, result);
};

export const archiveInquiry = async (req, res) => {
  const landlordId = req.user.id;
  const { messageId } = req.params;

  const result = await landlordDashboardService.archiveInquiry(landlordId, messageId);
  return respond(res, result);
};



