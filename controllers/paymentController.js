import { validationResult } from 'express-validator';
import {
  initializeBookingPayment,
  verifyPayment,
  handlePaystackWebhook,
  initiatePayout,
  listBanks,
  verifyBankAccount
} from '../services/paymentService.js';

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return null;
};

export const initializeBookingPaymentController = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const result = await initializeBookingPayment(req.user, req.params.bookingId, req.body);

  return res.status(result.statusCode || (result.success ? 200 : 500)).json({
    success: result.success,
    message: result.message,
    data: result.data
  });
};

export const verifyPaymentController = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { reference } = req.body;
  const result = await verifyPayment(reference);

  return res.status(result.statusCode || (result.success ? 200 : 500)).json({
    success: result.success,
    message: result.message,
    data: result.data
  });
};

export const handlePaystackWebhookController = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const result = await handlePaystackWebhook(rawBody, req.headers);

  return res.status(result.statusCode || (result.success ? 200 : 400)).json({
    success: result.success,
    message: result.message
  });
};

export const initiatePayoutController = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const result = await initiatePayout(req.user, req.body);

  return res.status(result.statusCode || (result.success ? 200 : 500)).json({
    success: result.success,
    message: result.message,
    data: result.data
  });
};

export const listBanksController = async (req, res) => {
  const result = await listBanks();

  return res.status(result.statusCode || (result.success ? 200 : 500)).json({
    success: result.success,
    message: result.message,
    data: result.data
  });
};

export const verifyBankAccountController = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const result = await verifyBankAccount(req.body);

  return res.status(result.statusCode || (result.success ? 200 : 500)).json({
    success: result.success,
    message: result.message,
    data: result.data
  });
};

export default {
  initializeBookingPayment: initializeBookingPaymentController,
  verifyPayment: verifyPaymentController,
  handlePaystackWebhook: handlePaystackWebhookController,
  initiatePayout: initiatePayoutController,
  listBanks: listBanksController,
  verifyBankAccount: verifyBankAccountController
};


