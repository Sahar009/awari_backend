import * as userDashboardService from '../services/userDashboardService.js';

/**
 * Get user's rental applications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMyRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    const result = await userDashboardService.getMyRentals(userId, options);

    return res.status(result.statusCode || 200).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get my rentals controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's purchase data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMyPurchases = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    const result = await userDashboardService.getMyPurchases(userId, options);

    return res.status(result.statusCode || 200).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get my purchases controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's shortlet bookings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getMyShortletBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    const result = await userDashboardService.getMyShortletBookings(userId, options);

    return res.status(result.statusCode || 200).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get my shortlet bookings controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's payment statements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPaymentStatements = async (req, res) => {
  try {
    const userId = req.user.id;
    const options = req.query;

    const result = await userDashboardService.getPaymentStatements(userId, options);

    return res.status(result.statusCode || 200).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get payment statements controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userDashboardService.getDashboardStats(userId);

    return res.status(result.statusCode || 200).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get dashboard stats controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

