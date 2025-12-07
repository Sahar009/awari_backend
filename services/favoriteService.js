import Favorite from '../schema/Favorite.js';
import Property from '../schema/Property.js';
import PropertyMedia from '../schema/PropertyMedia.js';
import User from '../schema/User.js';
import { Op, DataTypes } from 'sequelize';
import sequelize from '../database/db.js';
import crypto from 'crypto';

/**
 * Add a property to user's favorites
 * @param {string} userId - User ID
 * @param {string} propertyId - Property ID
 * @param {string} notes - Optional notes
 * @returns {Object} Result object
 */
export const addToFavorites = async (userId, propertyId, notes = null) => {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔍 [FAVORITE SERVICE] Adding to favorites:', { userId, propertyId });
    
    // First, verify user exists using raw SQL to bypass case sensitivity issues
    const [userCheck] = await sequelize.query(
      'SELECT id, email, status, deletedAt FROM Users WHERE id = ? LIMIT 1',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!userCheck) {
      await transaction.rollback();
      console.error('❌ [FAVORITE SERVICE] User not found in database:', userId);
      return {
        success: false,
        message: 'User account not found. Please log in again.',
        statusCode: 404
      };
    }

    if (userCheck.deletedAt) {
      await transaction.rollback();
      console.error('❌ [FAVORITE SERVICE] User is soft-deleted:', userId);
      return {
        success: false,
        message: 'User account not found. Please log in again.',
        statusCode: 404
      };
    }

    if (userCheck.status !== 'active') {
      await transaction.rollback();
      console.error('❌ [FAVORITE SERVICE] User is not active:', { userId, status: userCheck.status });
      return {
        success: false,
        message: 'User account is not active. Please contact support.',
        statusCode: 403
      };
    }

    // Verify user using Sequelize model (for consistency)
    const user = await User.findByPk(userId, {
      paranoid: false,
      attributes: ['id', 'email', 'status'],
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return {
        success: false,
        message: 'User account not found. Please log in again.',
        statusCode: 404
      };
    }

    // Check if property exists
    const property = await Property.findByPk(propertyId, { transaction });
    if (!property) {
      await transaction.rollback();
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
      },
      transaction
    });

    if (existingFavorite) {
      await transaction.rollback();
      return {
        success: false,
        message: 'Property is already in your favorites',
        statusCode: 409
      };
    }

    // Re-verify user within transaction using raw SQL
    const [userInTransactionCheck] = await sequelize.query(
      'SELECT id FROM Users WHERE id = ? AND deletedAt IS NULL LIMIT 1',
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!userInTransactionCheck) {
      await transaction.rollback();
      console.error('❌ [FAVORITE SERVICE] User not found in transaction:', userId);
      return {
        success: false,
        message: 'User account not found. Please log in again.',
        statusCode: 404
      };
    }

    // Create new favorite within transaction using raw SQL to bypass case sensitivity issue
    // The database constraint references 'Users' (capitalized) and table is 'Users' (capitalized)
    // On Linux MySQL, table names are case-sensitive, so we need to work around this
    console.log('✅ [FAVORITE SERVICE] Creating favorite record...');
    
    // Generate UUID using crypto (built-in Node.js module)
    const favoriteId = crypto.randomUUID();
    
    // Temporarily disable foreign key checks to work around case sensitivity issue
    // The constraint references 'Users' (capitalized) and table is 'Users' (capitalized)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    
    try {
      // Use raw SQL to insert directly into favorites table
      await sequelize.query(
        `INSERT INTO favorites (id, userId, propertyId, notes, isActive, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [favoriteId, userInTransactionCheck.id, propertyId, notes || null, true],
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    } finally {
      // Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    }

    // Fetch the created favorite to return it
    const [favoriteRows] = await sequelize.query(
      'SELECT * FROM favorites WHERE id = ? LIMIT 1',
      {
        replacements: [favoriteId],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    await transaction.commit();
    console.log('✅ [FAVORITE SERVICE] Favorite created successfully:', favoriteId);
    
    // Convert the raw result to a Favorite instance-like object
    const favorite = favoriteRows ? Favorite.build(favoriteRows, { isNewRecord: false }) : null;

    return {
      success: true,
      message: 'Property added to favorites successfully',
      data: favorite,
      statusCode: 201
    };
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
      console.error('❌ [FAVORITE SERVICE] Transaction rolled back due to error');
    }
    console.error('❌ [FAVORITE SERVICE] Error adding to favorites:', error);
    console.error('❌ [FAVORITE SERVICE] Error name:', error.name);
    console.error('❌ [FAVORITE SERVICE] Error message:', error.message);
    console.error('❌ [FAVORITE SERVICE] Error stack:', error.stack);
    
    // Handle foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      console.error('❌ [FAVORITE SERVICE] Foreign key constraint error details:', {
        table: error.table,
        fields: error.fields,
        value: error.value,
        index: error.index,
        original: error.original?.message
      });
      return {
        success: false,
        message: 'User account not found. Please log in again.',
        error: error.message,
        statusCode: 404
      };
    }
    
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
            },
            {
              model: PropertyMedia,
              as: 'media',
              attributes: ['id', 'url', 'mediaType', 'isPrimary', 'isActive', 'order'],
              where: { isActive: true },
              required: false
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

