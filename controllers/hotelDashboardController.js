import * as hotelDashboardService from '../services/hotelDashboardService.js';

const respond = (res, result) => {
  const statusCode = result?.statusCode || (result?.success ? 200 : 500);
  return res.status(statusCode).json({
    success: result?.success ?? false,
    message: result?.message,
    data: result?.data,
    error: result?.error
  });
};

export const getDashboardSummary = async (req, res) => {
  const hotelId = req.user.id;
  const result = await hotelDashboardService.getDashboardSummary(hotelId, req.query);
  return respond(res, result);
};

export const getRoomInventory = async (req, res) => {
  const hotelId = req.user.id;
  const result = await hotelDashboardService.getRoomInventory(hotelId, req.query);
  return respond(res, result);
};

export const updateRoomPricing = async (req, res) => {
  const hotelId = req.user.id;
  const { propertyId } = req.params;
  const result = await hotelDashboardService.updateRoomPricing(hotelId, propertyId, req.body);
  return respond(res, result);
};

export const getHotelBookings = async (req, res) => {
  const hotelId = req.user.id;
  const result = await hotelDashboardService.getHotelBookings(hotelId, req.query);
  return respond(res, result);
};

export const respondHotelBooking = async (req, res) => {
  const hotelId = req.user.id;
  const { bookingId } = req.params;
  const { action, notes } = req.body;
  const result = await hotelDashboardService.respondToHotelBooking(hotelId, bookingId, action, notes);
  return respond(res, result);
};

export const getAvailabilityCalendar = async (req, res) => {
  const hotelId = req.user.id;
  const { propertyId } = req.params;
  const result = await hotelDashboardService.getAvailabilityCalendar(hotelId, propertyId, req.query);
  return respond(res, result);
};

export const getHotelAnalytics = async (req, res) => {
  const hotelId = req.user.id;
  const result = await hotelDashboardService.getHotelAnalytics(hotelId, req.query);
  return respond(res, result);
};




