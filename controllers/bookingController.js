import * as bookingService from '../services/bookingService.js';

/**
 * Create a new booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createBooking = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      console.error('❌ User not authenticated:', { user: req.user, headers: req.headers });
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        error: 'Authentication required to create booking'
      });
    }

    const userId = req.user.id;
    const bookingData = req.body;

    console.log('📝 [BOOKING CONTROLLER] Creating booking:', {
      userId,
      bookingData: {
        ...bookingData,
        // Don't log sensitive data
        guestPhone: bookingData.guestPhone ? '***' : undefined
      }
    });

    const result = await bookingService.createBooking(userId, bookingData);
    
    console.log('📤 [BOOKING CONTROLLER] Service result:', {
      success: result.success,
      statusCode: result.statusCode,
      message: result.message,
      hasData: !!result.data,
      hasError: !!result.error
    });

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('❌ [BOOKING CONTROLLER] Create booking controller error:', error);
    console.error('❌ [BOOKING CONTROLLER] Error name:', error.name);
    console.error('❌ [BOOKING CONTROLLER] Error message:', error.message);
    console.error('❌ [BOOKING CONTROLLER] Error stack:', error.stack);
    console.error('❌ [BOOKING CONTROLLER] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return res.status(500).json({
      success: false,
      message: 'Unable to create booking. Please try again or contact support.',
      error: error.message
    });
  }
};

/**
 * Get booking by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const result = await bookingService.getBookingById(bookingId, userId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get booking by ID controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    const result = await bookingService.getUserBookings(userId, options);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get user bookings controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get property bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPropertyBookings = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;
    const options = req.query;

    const result = await bookingService.getPropertyBookings(propertyId, userId, options);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get property bookings controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const result = await bookingService.updateBooking(bookingId, userId, updateData);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Update booking controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Cancel booking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { cancellationReason } = req.body;

    const result = await bookingService.cancelBooking(bookingId, userId, cancellationReason);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Cancel booking controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Confirm booking (owner only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { ownerNotes } = req.body;

    const result = await bookingService.confirmBooking(bookingId, userId, ownerNotes);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Confirm booking controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Reject booking (owner only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { ownerNotes } = req.body;

    const result = await bookingService.rejectBooking(bookingId, userId, ownerNotes);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Reject booking controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Complete booking (owner only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { ownerNotes } = req.body;

    const result = await bookingService.completeBooking(bookingId, userId, ownerNotes);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Complete booking controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get booking statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getBookingStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'user' } = req.query;

    const result = await bookingService.getBookingStatistics(userId, type);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get booking statistics controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Download booking receipt as PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const downloadBookingReceipt = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.id;
    const { id: bookingId } = req.params;

    console.log(`📄 [BOOKING CONTROLLER] Downloading receipt for booking ${bookingId}`);

    const result = await bookingService.downloadBookingReceipt(bookingId, userId);

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=booking-receipt-${bookingId}.pdf`);
    res.setHeader('Content-Length', result.data.length);

    // Send PDF buffer
    return res.send(result.data);
  } catch (error) {
    console.error('❌ [BOOKING CONTROLLER] Download receipt error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download receipt',
      error: error.message
    });
  }
};
