import * as favoriteService from '../services/favoriteService.js';

/**
 * Add a property to user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addToFavorites = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const result = await favoriteService.addToFavorites(userId, propertyId, notes);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Add to favorites controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Remove a property from user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const removeFromFavorites = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    const result = await favoriteService.removeFromFavorites(userId, propertyId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      error: result.error
    });
  } catch (error) {
    console.error('Remove from favorites controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user's favorite properties
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      propertyType,
      listingType,
      status
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      propertyType,
      listingType,
      status
    };

    const result = await favoriteService.getUserFavorites(userId, options);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Get user favorites controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Check if a property is favorited by user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkFavoriteStatus = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user.id;

    const result = await favoriteService.checkFavoriteStatus(userId, propertyId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Check favorite status controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Clear all user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const clearAllFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await favoriteService.clearAllFavorites(userId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Clear all favorites controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Update favorite notes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateFavoriteNotes = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    const result = await favoriteService.updateFavoriteNotes(userId, propertyId, notes);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    });
  } catch (error) {
    console.error('Update favorite notes controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
