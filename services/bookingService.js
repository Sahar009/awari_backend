import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import User from '../schema/User.js';
import { Op } from 'sequelize';
import { 
  blockDatesForBooking, 
  unblockDatesForBooking, 
  checkDateRangeAvailability 
} from './availabilityService.js';

/**
 * Create a new booking
 * @param {string} userId - User ID making the booking
 * @param {Object} bookingData - Booking data
 * @returns {Object} Result object
 */
export const createBooking = async (userId, bookingData) => {
  try {
    const {
      propertyId,
      bookingType,
      checkInDate,
      checkOutDate,
      inspectionDate,
      inspectionTime,
      numberOfNights,
      numberOfGuests,
      basePrice,
      totalPrice,
      currency = 'NGN',
      serviceFee = 0,
      taxAmount = 0,
      discountAmount = 0,
      guestName,
      guestPhone,
      guestEmail,
      specialRequests
    } = bookingData;

    // Verify property exists and get owner
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    // Check for conflicting bookings and availability
    if (bookingType === 'shortlet' || bookingType === 'rental') {
      // Check availability using the new availability service
      const availabilityCheck = await checkDateRangeAvailability(propertyId, checkInDate, checkOutDate);
      
      if (!availabilityCheck.available) {
        return {
          success: false,
          message: 'Property is not available for the selected dates',
          details: availabilityCheck.conflictingDates,
          statusCode: 409
        };
      }

      // Also check for existing confirmed bookings as a fallback
      const conflictingBooking = await Booking.findOne({
        where: {
          propertyId,
          status: {
            [Op.in]: ['confirmed', 'pending']
          },
          [Op.or]: [
            {
              checkInDate: {
                [Op.between]: [checkInDate, checkOutDate]
              }
            },
            {
              checkOutDate: {
                [Op.between]: [checkInDate, checkOutDate]
              }
            },
            {
              checkInDate: { [Op.lte]: checkInDate },
              checkOutDate: { [Op.gte]: checkOutDate }
            }
          ]
        }
      });

      if (conflictingBooking) {
        return {
          success: false,
          message: 'Property is not available for the selected dates',
          statusCode: 409
        };
      }
    }

    // Create booking
    const booking = await Booking.create({
      propertyId,
      userId,
      ownerId: property.owner.id,
      bookingType,
      checkInDate,
      checkOutDate,
      inspectionDate,
      inspectionTime,
      numberOfNights,
      numberOfGuests: numberOfGuests || 1,
      basePrice,
      totalPrice,
      currency,
      serviceFee,
      taxAmount,
      discountAmount,
      guestName,
      guestPhone,
      guestEmail,
      specialRequests,
      status: 'pending'
    });

    // Fetch the created booking with relations
    const createdBooking = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ]
    });

    return {
      success: true,
      message: 'Booking created successfully',
      data: createdBooking,
      statusCode: 201
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      message: 'Failed to create booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Result object
 */
export const getBookingById = async (bookingId, userId) => {
  try {
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'cancelledByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check authorization
    if (booking.userId !== userId && booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Unauthorized to view this booking',
        statusCode: 403
      };
    }

    return {
      success: true,
      message: 'Booking retrieved successfully',
      data: booking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error getting booking:', error);
    return {
      success: false,
      message: 'Failed to retrieve booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user's bookings
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getUserBookings = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      bookingType,
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      [Op.or]: [
        { userId },
        { ownerId: userId }
      ]
    };

    if (status) whereClause.status = status;
    if (bookingType) whereClause.bookingType = bookingType;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = startDate;
      if (endDate) whereClause.createdAt[Op.lte] = endDate;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: {
        bookings,
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
    console.error('Error getting user bookings:', error);
    return {
      success: false,
      message: 'Failed to retrieve bookings',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get property bookings
 * @param {string} propertyId - Property ID
 * @param {string} userId - User ID (property owner)
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getPropertyBookings = async (propertyId, userId, options = {}) => {
  try {
    // Verify user owns the property
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    if (property.ownerId !== userId) {
      return {
        success: false,
        message: 'Unauthorized to view property bookings',
        statusCode: 403
      };
    }

    const {
      page = 1,
      limit = 10,
      status,
      bookingType,
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { propertyId };
    if (status) whereClause.status = status;
    if (bookingType) whereClause.bookingType = bookingType;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = startDate;
      if (endDate) whereClause.createdAt[Op.lte] = endDate;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Property bookings retrieved successfully',
      data: {
        bookings,
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
    console.error('Error getting property bookings:', error);
    return {
      success: false,
      message: 'Failed to retrieve property bookings',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Update booking
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Object} Result object
 */
export const updateBooking = async (bookingId, userId, updateData) => {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check authorization
    if (booking.userId !== userId && booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Unauthorized to update this booking',
        statusCode: 403
      };
    }

    // Prevent updates to completed/cancelled bookings
    if (['completed', 'cancelled'].includes(booking.status)) {
      return {
        success: false,
        message: 'Cannot update completed or cancelled bookings',
        statusCode: 400
      };
    }

    // Update booking
    await booking.update(updateData);

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ]
    });

    return {
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error updating booking:', error);
    return {
      success: false,
      message: 'Failed to update booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @param {string} cancellationReason - Cancellation reason
 * @returns {Object} Result object
 */
export const cancelBooking = async (bookingId, userId, cancellationReason = null) => {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check authorization
    if (booking.userId !== userId && booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Unauthorized to cancel this booking',
        statusCode: 403
      };
    }

    // Check if booking can be cancelled
    if (['cancelled', 'completed'].includes(booking.status)) {
      return {
        success: false,
        message: 'Booking cannot be cancelled',
        statusCode: 400
      };
    }

    // Update booking status
    await booking.update({
      status: 'cancelled',
      cancellationReason,
      cancelledBy: userId,
      cancelledAt: new Date()
    });

    // Unblock dates for the cancelled booking
    if (booking.bookingType === 'shortlet' || booking.bookingType === 'rental') {
      try {
        await unblockDatesForBooking(booking.propertyId, booking.id);
      } catch (availabilityError) {
        console.error('Error unblocking dates for cancelled booking:', availabilityError);
        // Don't fail the booking cancellation if availability unblocking fails
      }
    }

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'cancelledByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ]
    });

    return {
      success: true,
      message: 'Booking cancelled successfully',
      data: updatedBooking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return {
      success: false,
      message: 'Failed to cancel booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Confirm booking (owner only)
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID (property owner)
 * @param {string} ownerNotes - Owner notes
 * @returns {Object} Result object
 */
export const confirmBooking = async (bookingId, userId, ownerNotes = null) => {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check if user is the property owner
    if (booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Only property owner can confirm bookings',
        statusCode: 403
      };
    }

    // Check if booking can be confirmed
    if (booking.status !== 'pending') {
      return {
        success: false,
        message: 'Only pending bookings can be confirmed',
        statusCode: 400
      };
    }

    // Update booking status
    await booking.update({
      status: 'confirmed',
      ownerNotes
    });

    // Block dates for the confirmed booking
    if (booking.bookingType === 'shortlet' || booking.bookingType === 'rental') {
      try {
        await blockDatesForBooking(
          booking.propertyId,
          booking.id,
          booking.checkInDate,
          booking.checkOutDate,
          userId
        );
      } catch (availabilityError) {
        console.error('Error blocking dates for booking:', availabilityError);
        // Don't fail the booking confirmation if availability blocking fails
        // This ensures the booking is still confirmed even if there's an availability issue
      }
    }

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ]
    });

    return {
      success: true,
      message: 'Booking confirmed successfully',
      data: updatedBooking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error confirming booking:', error);
    return {
      success: false,
      message: 'Failed to confirm booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Reject booking (owner only)
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID (property owner)
 * @param {string} ownerNotes - Rejection reason
 * @returns {Object} Result object
 */
export const rejectBooking = async (bookingId, userId, ownerNotes = null) => {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check if user is the property owner
    if (booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Only property owner can reject bookings',
        statusCode: 403
      };
    }

    // Check if booking can be rejected
    if (booking.status !== 'pending') {
      return {
        success: false,
        message: 'Only pending bookings can be rejected',
        statusCode: 400
      };
    }

    // Update booking status
    await booking.update({
      status: 'rejected',
      ownerNotes
    });

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ]
    });

    return {
      success: true,
      message: 'Booking rejected successfully',
      data: updatedBooking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error rejecting booking:', error);
    return {
      success: false,
      message: 'Failed to reject booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Complete booking (owner only)
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID (property owner)
 * @param {string} ownerNotes - Completion notes
 * @returns {Object} Result object
 */
export const completeBooking = async (bookingId, userId, ownerNotes = null) => {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    // Check if user is the property owner
    if (booking.ownerId !== userId) {
      return {
        success: false,
        message: 'Only property owner can complete bookings',
        statusCode: 403
      };
    }

    // Check if booking can be completed
    if (!['confirmed'].includes(booking.status)) {
      return {
        success: false,
        message: 'Only confirmed bookings can be completed',
        statusCode: 400
      };
    }

    // Update booking status
    await booking.update({
      status: 'completed',
      ownerNotes
    });

    // Fetch updated booking with relations
    const updatedBooking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
            }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ]
    });

    return {
      success: true,
      message: 'Booking completed successfully',
      data: updatedBooking,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error completing booking:', error);
    return {
      success: false,
      message: 'Failed to complete booking',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get booking statistics
 * @param {string} userId - User ID
 * @param {string} type - Statistics type ('user' or 'owner')
 * @returns {Object} Result object
 */
export const getBookingStatistics = async (userId, type = 'user') => {
  try {
    const whereClause = type === 'owner' ? { ownerId: userId } : { userId };

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      totalRevenue
    ] = await Promise.all([
      Booking.count({ where: whereClause }),
      Booking.count({ where: { ...whereClause, status: 'pending' } }),
      Booking.count({ where: { ...whereClause, status: 'confirmed' } }),
      Booking.count({ where: { ...whereClause, status: 'completed' } }),
      Booking.count({ where: { ...whereClause, status: 'cancelled' } }),
      Booking.count({ where: { ...whereClause, status: 'rejected' } }),
      Booking.sum('totalPrice', { 
        where: { ...whereClause, status: 'completed' } 
      })
    ]);

    const statistics = {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      rejected: rejectedBookings,
      totalRevenue: totalRevenue || 0,
      successRate: totalBookings > 0 ? 
        Math.round(((completedBookings + confirmedBookings) / totalBookings) * 100) : 0
    };

    return {
      success: true,
      message: 'Booking statistics retrieved successfully',
      data: statistics,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error getting booking statistics:', error);
    return {
      success: false,
      message: 'Failed to retrieve booking statistics',
      error: error.message,
      statusCode: 500
    };
  }
};
