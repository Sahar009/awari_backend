import Favorite from '../schema/Favorite.js';
import Property from '../schema/Property.js';
import User from '../schema/User.js';
import { Op } from 'sequelize';

/**
 * Add a property to user's favorites
 * @param {string} userId - User ID
 * @param {string} propertyId - Property ID
 * @param {string} notes - Optional notes
 * @returns {Object} Result object
 */
export const addToFavorites = async (userId, propertyId, notes = null) => {
  try {
    // Check if property exists
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      where: {
        userId,
        propertyId,
        isActive: true
      }
    });

    if (existingFavorite) {
      return {
        success: false,
        message: 'Property is already in your favorites',
        statusCode: 409
      };
    }

    // Create new favorite
    const favorite = await Favorite.create({
      userId,
      propertyId,
      notes,
      isActive: true
    });

    return {
      success: true,
      message: 'Property added to favorites successfully',
      data: favorite,
      statusCode: 201
    };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return {
      success: false,
      message: 'Failed to add property to favorites',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Remove a property from user's favorites
 * @param {string} userId - User ID
 * @param {string} propertyId - Property ID
 * @returns {Object} Result object
 */
export const removeFromFavorites = async (userId, propertyId) => {
  try {
    const favorite = await Favorite.findOne({
      where: {
        userId,
        propertyId,
        isActive: true
      }
    });

    if (!favorite) {
      return {
        success: false,
        message: 'Property not found in your favorites',
        statusCode: 404
      };
    }

    // Actually delete the favorite record to avoid unique constraint issues
    await favorite.destroy();

    return {
      success: true,
      message: 'Property removed from favorites successfully',
      statusCode: 200
    };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return {
      success: false,
      message: 'Failed to remove property from favorites',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user's favorite properties
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getUserFavorites = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      propertyType,
      listingType,
      status
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause for property filters
    const propertyWhere = {};
    if (propertyType) propertyWhere.propertyType = propertyType;
    if (listingType) propertyWhere.listingType = listingType;
    if (status) propertyWhere.status = status;

    const { count, rows: favorites } = await Favorite.findAndCountAll({
      where: {
        userId,
        isActive: true
      },
      include: [
        {
          model: Property,
          as: 'property',
          where: propertyWhere,
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            },
            {
              model: User,
              as: 'agent',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Favorites retrieved successfully',
      data: {
        favorites: favorites.map(fav => ({
          id: fav.id,
          notes: fav.notes,
          createdAt: fav.createdAt,
          property: fav.property
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return {
      success: false,
      message: 'Failed to retrieve favorites',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Check if a property is favorited by user
 * @param {string} userId - User ID
 * @param {string} propertyId - Property ID
 * @returns {Object} Result object
 */
export const checkFavoriteStatus = async (userId, propertyId) => {
  try {
    const favorite = await Favorite.findOne({
      where: {
        userId,
        propertyId,
        isActive: true
      }
    });

    return {
      success: true,
      message: 'Favorite status retrieved successfully',
      data: {
        isFavorited: !!favorite,
        favoriteId: favorite?.id || null,
        notes: favorite?.notes || null
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return {
      success: false,
      message: 'Failed to check favorite status',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Clear all user's favorites
 * @param {string} userId - User ID
 * @returns {Object} Result object
 */
export const clearAllFavorites = async (userId) => {
  try {
    const result = await Favorite.destroy({
      where: {
        userId,
        isActive: true
      }
    });

    return {
      success: true,
      message: `Cleared ${result} favorites successfully`,
      data: {
        clearedCount: result
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Error clearing all favorites:', error);
    return {
      success: false,
      message: 'Failed to clear all favorites',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Update favorite notes
 * @param {string} userId - User ID
 * @param {string} propertyId - Property ID
 * @param {string} notes - New notes
 * @returns {Object} Result object
 */
export const updateFavoriteNotes = async (userId, propertyId, notes) => {
  try {
    const favorite = await Favorite.findOne({
      where: {
        userId,
        propertyId,
        isActive: true
      }
    });

    if (!favorite) {
      return {
        success: false,
        message: 'Property not found in your favorites',
        statusCode: 404
      };
    }

    await favorite.update({ notes });

    return {
      success: true,
      message: 'Favorite notes updated successfully',
      data: favorite,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error updating favorite notes:', error);
    return {
      success: false,
      message: 'Failed to update favorite notes',
      error: error.message,
      statusCode: 500
    };
  }
};

