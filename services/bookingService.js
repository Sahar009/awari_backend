import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import User from '../schema/User.js';
import { Op } from 'sequelize';
import {
  blockDatesForBooking,
  unblockDatesForBooking,
  checkDateRangeAvailability
} from './availabilityService.js';
import { sendTemplateNotification } from './notificationService.js';
import { sendEmail } from '../modules/notifications/email.js';
import Payment from '../schema/Payment.js';
import sequelize from '../database/db.js';
import { generateBookingReceiptPDF } from './pdfService.js';
import amadeusService from './amadeusService.js';

/**
 * Create a new booking
 * @param {string} userId - User ID making the booking
 * @param {Object} bookingData - Booking data
 * @returns {Object} Result object
 */
export const createBooking = async (userId, bookingData) => {
  console.log('🚀 [BOOKING SERVICE] Starting createBooking');
  console.log('🚀 [BOOKING SERVICE] userId:', userId);
  console.log('🚀 [BOOKING SERVICE] bookingData:', JSON.stringify(bookingData, null, 2));

  try {
    // Verify user exists
    if (!userId) {
      console.error('❌ [BOOKING SERVICE] No userId provided');
      return {
        success: false,
        message: 'User ID is required',
        statusCode: 400
      };
    }

    console.log('🔍 [BOOKING SERVICE] Checking if user exists:', userId);
    const user = await User.findByPk(userId, {
      paranoid: true,
      attributes: ['id', 'email', 'firstName', 'lastName', 'status']
    });

    if (!user) {
      console.error('❌ User not found in database:', userId);
      console.error('🔍 Attempting to find user without paranoid mode...');
      const userWithoutParanoid = await User.findByPk(userId, {
        paranoid: false,
        attributes: ['id', 'email', 'firstName', 'lastName', 'status', 'deletedAt']
      });

      if (userWithoutParanoid) {
        console.error('⚠️ User exists but is soft-deleted:', {
          id: userWithoutParanoid.id,
          deletedAt: userWithoutParanoid.deletedAt
        });
        return {
          success: false,
          message: 'Your account has been deleted. Please contact support.',
          statusCode: 403
        };
      }

      return {
        success: false,
        message: 'User not found. Please log in again.',
        statusCode: 404
      };
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      status: user.status
    });

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

    console.log('📋 [BOOKING SERVICE] Extracted booking data:', {
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
      currency,
      serviceFee,
      taxAmount,
      discountAmount,
      guestName,
      guestPhone: guestPhone ? '***' : undefined,
      guestEmail,
      specialRequests: specialRequests ? '***' : undefined
    });

    // Verify property exists and get owner
    console.log('🔍 [BOOKING SERVICE] Fetching property:', propertyId);
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'status'],
          paranoid: false // Include soft-deleted users to check their status
        }
      ]
    });

    if (!property) {
      console.error('❌ [BOOKING SERVICE] Property not found:', propertyId);
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    console.log('✅ [BOOKING SERVICE] Property found:', {
      id: property.id,
      title: property.title,
      ownerId: property.ownerId,
      hasOwner: !!property.owner
    });

    // Check for conflicting bookings and availability
    if (bookingType === 'shortlet' || bookingType === 'rental' || bookingType === 'hotel') {
      console.log('🔍 [BOOKING SERVICE] Checking availability for:', { propertyId, checkInDate, checkOutDate });
      // Check availability using the new availability service
      const availabilityCheck = await checkDateRangeAvailability(propertyId, checkInDate, checkOutDate);
      console.log('📊 [BOOKING SERVICE] Availability check result:', availabilityCheck);

      if (!availabilityCheck.available) {
        return {
          success: false,
          message: 'Property is not available for the selected dates',
          details: availabilityCheck.conflictingDates,
          statusCode: 409
        };
      }

      // Also check for existing confirmed bookings as a fallback
      // Only check 'confirmed' status to avoid conflicts with user's own pending bookings
      const conflictingBooking = await Booking.findOne({
        where: {
          propertyId,
          status: 'confirmed', // Only check confirmed bookings, not pending
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
        console.log('❌ [BOOKING SERVICE] Found conflicting confirmed booking:', conflictingBooking.id);
        return {
          success: false,
          message: 'Property is not available for the selected dates',
          statusCode: 409
        };
      }
    }

    // Validate property owner exists
    if (!property.owner || !property.owner.id) {
      console.error('❌ [BOOKING SERVICE] Property owner not found:', {
        propertyId,
        ownerId: property.ownerId,
        owner: property.owner,
        propertyData: {
          id: property.id,
          title: property.title,
          ownerId: property.ownerId
        }
      });

      // Try to fetch owner directly to see if it exists but wasn't included
      if (property.ownerId) {
        const ownerCheck = await User.findByPk(property.ownerId, {
          paranoid: false,
          attributes: ['id', 'email', 'status', 'deletedAt']
        });

        if (ownerCheck) {
          if (ownerCheck.deletedAt) {
            return {
              success: false,
              message: 'Property owner account has been deleted. This property is no longer available.',
              statusCode: 400
            };
          }
          if (ownerCheck.status !== 'active') {
            return {
              success: false,
              message: `Property owner account is ${ownerCheck.status}. This property is currently unavailable.`,
              statusCode: 400
            };
          }
        }
      }

      return {
        success: false,
        message: 'Property owner information is missing. Please contact support.',
        statusCode: 400
      };
    }

    // Check if owner is soft-deleted or inactive
    if (property.owner.deletedAt) {
      return {
        success: false,
        message: 'Property owner account has been deleted. This property is no longer available.',
        statusCode: 400
      };
    }

    if (property.owner.status !== 'active') {
      return {
        success: false,
        message: `Property owner account is ${property.owner.status}. This property is currently unavailable.`,
        statusCode: 400
      };
    }

    console.log('✅ [BOOKING SERVICE] Property owner found:', {
      ownerId: property.owner.id,
      ownerEmail: property.owner.email
    });

    // Use transaction to ensure atomicity and prevent race conditions
    const transaction = await sequelize.transaction();

    try {
      // Re-verify user exists within transaction to prevent race conditions
      console.log('🔍 [BOOKING SERVICE] Re-verifying user within transaction:', userId);

      // First, verify user exists using Sequelize
      const userInTransaction = await User.findByPk(userId, {
        paranoid: true,
        attributes: ['id', 'email', 'status'],
        transaction
      });

      if (!userInTransaction) {
        console.error('❌ [BOOKING SERVICE] User not found within transaction:', userId);
        await transaction.rollback();

        // Check if user is soft-deleted
        const userWithoutParanoid = await User.findByPk(userId, {
          paranoid: false,
          attributes: ['id', 'email', 'deletedAt', 'status']
        });

        if (userWithoutParanoid && userWithoutParanoid.deletedAt) {
          return {
            success: false,
            message: 'Your account has been deleted. Please contact support.',
            statusCode: 403
          };
        }

        return {
          success: false,
          message: 'User account not found. Please log in again.',
          statusCode: 404
        };
      }

      console.log('✅ [BOOKING SERVICE] User verified within transaction:', {
        id: userInTransaction.id,
        email: userInTransaction.email,
        status: userInTransaction.status
      });

      // Double-check user exists in the exact table the foreign key references
      // The foreign key constraint references 'Users' table (capitalized), verify user exists
      console.log('🔍 [BOOKING SERVICE] Verifying user exists in database table via raw SQL');

      // Check user existence using raw SQL (use capitalized 'Users' table name - matches User model tableName)
      const [userCheckResult] = await sequelize.query(
        'SELECT id, email, deletedAt FROM Users WHERE id = ? AND deletedAt IS NULL',
        {
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!userCheckResult) {
        console.error('❌ [BOOKING SERVICE] User not found in database table via raw SQL:', userId);
        await transaction.rollback();

        // Check if user exists but is soft-deleted
        const [deletedUserCheck] = await sequelize.query(
          'SELECT id, email, deletedAt FROM Users WHERE id = ?',
          {
            replacements: [userId],
            type: sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        if (deletedUserCheck && deletedUserCheck.deletedAt) {
          return {
            success: false,
            message: 'Your account has been deleted. Please contact support.',
            statusCode: 403
          };
        }

        return {
          success: false,
          message: 'User account not found in database. Please log in again.',
          statusCode: 404
        };
      }

      console.log('✅ [BOOKING SERVICE] User verified in database table via raw SQL:', {
        id: userCheckResult.id,
        email: userCheckResult.email
      });

      // Create booking
      console.log('📝 [BOOKING SERVICE] Creating booking with data:', {
        userId,
        propertyId,
        ownerId: property.owner.id,
        bookingType,
        checkInDate,
        checkOutDate,
        inspectionDate,
        inspectionTime,
        numberOfNights,
        numberOfGuests: numberOfGuests || 1,
        basePrice: Number(basePrice),
        totalPrice: Number(totalPrice),
        currency,
        serviceFee: serviceFee ? Number(serviceFee) : 0,
        taxAmount: taxAmount ? Number(taxAmount) : 0,
        discountAmount: discountAmount ? Number(discountAmount) : 0
      });

      const bookingPayload = {
        propertyId,
        userId: userInTransaction.id, // Use the verified user ID from transaction
        ownerId: property.owner.id,
        bookingType,
        checkInDate: checkInDate || null,
        checkOutDate: checkOutDate || null,
        inspectionDate: inspectionDate || null,
        inspectionTime: inspectionTime || null,
        numberOfNights: numberOfNights || null,
        numberOfGuests: numberOfGuests || 1,
        basePrice: Number(basePrice),
        totalPrice: Number(totalPrice),
        currency: currency || 'NGN',
        serviceFee: serviceFee ? Number(serviceFee) : 0,
        taxAmount: taxAmount ? Number(taxAmount) : 0,
        discountAmount: discountAmount ? Number(discountAmount) : 0,
        guestName: guestName || null,
        guestPhone: guestPhone || null,
        guestEmail: guestEmail || null,
        specialRequests: specialRequests || null,
        status: 'pending',
        paymentStatus: 'pending'
      };

      console.log('💾 [BOOKING SERVICE] Booking payload:', JSON.stringify(bookingPayload, null, 2));
      const booking = await Booking.create(bookingPayload, { transaction });
      console.log('✅ [BOOKING SERVICE] Booking created successfully:', booking.id);

      // Commit transaction
      await transaction.commit();
      console.log('✅ [BOOKING SERVICE] Transaction committed successfully');

      // HANDLE EXTERNAL BOOKING AFTER LOCAL SUCCESS
      if (property.source === 'amadeus' || property.source === 'booking_com') {
        console.log(`🌐 [BOOKING SERVICE] Property is external (${property.source}). Synchronizing...`);
        try {
          // Both currently use similar adapter patterns
          const service = property.source === 'amadeus' ? amadeusService : null;

          if (service) {
            const externalResult = await service.createBooking({
              ...bookingPayload,
              localBookingId: booking.id
            });

            if (externalResult.success) {
              console.log('✅ [BOOKING SERVICE] External booking successful:', externalResult.externalBookingId);
              await booking.update({
                externalBookingId: externalResult.externalBookingId,
                externalStatus: externalResult.externalStatus || 'confirmed'
              });
            } else {
              console.warn('⚠️ [BOOKING SERVICE] External booking failed but local record preserved:', externalResult.message);
            }
          }
        } catch (externalError) {
          console.error('❌ [BOOKING SERVICE] Error during external synchronization:', externalError);
        }
      }

      // Fetch the complete booking with relations
      const completeBooking = await Booking.findByPk(booking.id, {
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

      console.log('✅ [BOOKING SERVICE] Complete booking data:', JSON.stringify(completeBooking?.toJSON(), null, 2));

      return {
        success: true,
        message: 'Booking created successfully',
        data: { booking: completeBooking },
        statusCode: 201
      };
    } catch (error) {
      // Rollback transaction on error
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        console.error('❌ [BOOKING SERVICE] Transaction rolled back due to error');
      }

      console.error('❌ [BOOKING SERVICE] Error creating booking:', error);
      console.error('❌ [BOOKING SERVICE] Error name:', error.name);
      console.error('❌ [BOOKING SERVICE] Error message:', error.message);
      console.error('❌ [BOOKING SERVICE] Error stack:', error.stack);
      console.error('❌ [BOOKING SERVICE] Error details:', {
        name: error.name,
        message: error.message,
        errors: error.errors,
        fields: error.fields,
        value: error.value,
        original: error.original
      });

      // Check if it's a foreign key constraint error
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        console.error('🔍 Foreign key constraint error details:', {
          table: error.table,
          fields: error.fields,
          value: error.value,
          index: error.index,
          original: error.original
        });

        // If it's the userId foreign key, verify user exists
        if (error.fields && error.fields.includes('userId')) {
          console.error('🔍 [BOOKING SERVICE] userId foreign key constraint failed');
          console.error('🔍 [BOOKING SERVICE] Attempted userId:', userId);
          console.error('🔍 [BOOKING SERVICE] userId type:', typeof userId);
          console.error('🔍 [BOOKING SERVICE] userId length:', userId?.length);

          const userCheck = await User.findByPk(userId, {
            paranoid: false,
            attributes: ['id', 'email', 'deletedAt', 'status']
          });

          if (!userCheck) {
            console.error('❌ [BOOKING SERVICE] User does not exist in database');
            return {
              success: false,
              message: 'User account not found. Please log in again.',
              statusCode: 404
            };
          } else if (userCheck.deletedAt) {
            console.error('❌ [BOOKING SERVICE] User is soft-deleted:', userCheck.deletedAt);
            return {
              success: false,
              message: 'Your account has been deleted. Please contact support.',
              statusCode: 403
            };
          } else {
            console.error('⚠️ [BOOKING SERVICE] User exists but foreign key constraint failed');
            console.error('⚠️ [BOOKING SERVICE] User ID from DB:', userCheck.id);
            console.error('⚠️ [BOOKING SERVICE] User ID type from DB:', typeof userCheck.id);
            console.error('⚠️ [BOOKING SERVICE] User ID length from DB:', userCheck.id?.length);
            console.error('⚠️ [BOOKING SERVICE] IDs match:', userCheck.id === userId);
            console.error('⚠️ [BOOKING SERVICE] IDs match (string):', String(userCheck.id) === String(userId));

            return {
              success: false,
              message: 'User account validation failed. Please log out and log in again.',
              statusCode: 400
            };
          }
        }

        // If it's the propertyId foreign key
        if (error.fields && error.fields.includes('propertyId')) {
          return {
            success: false,
            message: 'Property not found or invalid',
            statusCode: 404
          };
        }

        // If it's the ownerId foreign key
        if (error.fields && error.fields.includes('ownerId')) {
          return {
            success: false,
            message: 'Property owner not found',
            statusCode: 404
          };
        }

        return {
          success: false,
          message: error.message || 'Database constraint error. Please check your data.',
          error: error.original?.message || error.message,
          statusCode: 400
        };
      }

      // Handle validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message
        }));
        console.error('🔍 Validation errors:', validationErrors);
        return {
          success: false,
          message: 'Validation failed',
          errors: validationErrors,
          statusCode: 400
        };
      }

      // Re-throw other errors to be caught by outer catch
      throw error;
    }
  } catch (outerError) {
    console.error('❌ [BOOKING SERVICE] Outer catch error:', outerError);
    return {
      success: false,
      message: outerError.message || 'Failed to create booking',
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

    // Process refund if payment was made
    let refundProcessed = false;
    if (['completed', 'partial'].includes(booking.paymentStatus) && booking.totalPrice > 0) {
      try {
        console.log(`💰 Processing refund for booking ${bookingId}, amount: ${booking.totalPrice}`);

        const walletService = (await import('./walletService.js')).default;
        await walletService.processRefund(
          booking.userId,
          booking.totalPrice,
          `Refund for cancelled booking #${bookingId.substring(0, 8)}`,
          bookingId
        );

        refundProcessed = true;
        console.log(`✅ Refund processed successfully for booking ${bookingId}`);
      } catch (refundError) {
        console.error('❌ Error processing refund for cancelled booking:', refundError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update booking status
    await booking.update({
      status: 'cancelled',
      paymentStatus: refundProcessed ? 'refunded' : booking.paymentStatus,
      cancellationReason,
      cancelledBy: userId,
      cancelledAt: new Date()
    });

    // Unblock dates for the cancelled booking
    if (booking.bookingType === 'shortlet' || booking.bookingType === 'rental' || booking.bookingType === 'hotel') {
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

    // Send notification to guest about booking cancellation
    try {
      const guest = await User.findByPk(booking.userId);
      if (guest) {
        await sendTemplateNotification('BOOKING_CANCELLED', guest, {
          booking: updatedBooking,
          property: updatedBooking.property
        });

        // Send refund email if refund was processed
        if (refundProcessed) {
          const { sendEmail } = await import('../modules/notifications/email.js');
          await sendEmail({
            to: guest.email,
            subject: 'Booking Cancelled - Refund Processed 💰',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Booking Cancelled & Refunded</h2>
                <p>Dear ${guest.firstName},</p>
                <p>Your booking has been cancelled and a full refund has been processed to your wallet.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Booking Details:</h3>
                  <p><strong>Property:</strong> ${updatedBooking.property?.title || 'N/A'}</p>
                  <p><strong>Booking ID:</strong> #${bookingId.substring(0, 8)}</p>
                  <p><strong>Check-in:</strong> ${new Date(updatedBooking.checkInDate).toLocaleDateString()}</p>
                  <p><strong>Check-out:</strong> ${new Date(updatedBooking.checkOutDate).toLocaleDateString()}</p>
                  ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
                </div>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                  <h3 style="margin-top: 0; color: #10b981;">Refund Processed</h3>
                  <p style="margin: 0;"><strong>Amount Refunded:</strong> ₦${parseFloat(booking.totalPrice).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                  <p style="margin: 10px 0 0 0;">The funds have been credited to your AWARI wallet and are available for immediate use.</p>
                </div>
                
                <p>You can view your wallet balance and transaction history in your profile.</p>
                <p>We're sorry to see this booking cancelled. We hope to serve you again soon!</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">
                  If you have any questions, please contact our support team.
                </p>
              </div>
            `
          });
          console.log('✅ Refund notification email sent to user');
        }
      }
    } catch (notificationError) {
      console.error('Error sending booking cancellation notification:', notificationError);
    }

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
    if (booking.bookingType === 'shortlet' || booking.bookingType === 'rental' || booking.bookingType === 'hotel') {
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

    // Send notification to guest about booking confirmation
    try {
      const guest = await User.findByPk(booking.userId);
      if (guest) {
        await sendTemplateNotification('BOOKING_CONFIRMED', guest, {
          booking: updatedBooking,
          property: updatedBooking.property
        });
      }
    } catch (notificationError) {
      console.error('Error sending booking confirmation notification:', notificationError);
    }

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

/**
 * Send booking receipt/invoice email
 * @param {Object} booking - Booking object with relations
 * @param {Object} user - User object
 * @param {Object} payment - Payment object (optional)
 * @returns {Promise<boolean>} Success status
 */
export const sendBookingReceipt = async (booking, user, payment = null) => {
  try {
    if (!booking || !user) {
      console.error('Booking and user are required to send receipt');
      return false;
    }

    // Fetch booking with all relations if not already included
    let bookingWithRelations = booking;
    if (!booking.property || !booking.user) {
      bookingWithRelations = await Booking.findByPk(booking.id, {
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
    }

    // Fetch payment if not provided
    let paymentData = payment;
    if (!paymentData && booking.id) {
      paymentData = await Payment.findOne({
        where: { bookingId: booking.id },
        order: [['createdAt', 'DESC']]
      });
    }

    const context = {
      booking: bookingWithRelations,
      user: user,
      property: bookingWithRelations.property,
      payment: paymentData,
      actionUrl: `${process.env.FRONTEND_URL || 'https://awari.com'}/bookings/${booking.id}`
    };

    const subject = `Booking Receipt - ${bookingWithRelations.property?.title || 'Your Booking'}`;
    const text = `Thank you for your booking. Your receipt is attached. Booking ID: ${booking.id}`;

    const emailSent = await sendEmail(
      user.email,
      subject,
      text,
      'booking-receipt',
      context
    );

    if (emailSent) {
      console.log(`Booking receipt sent successfully to ${user.email} for booking ${booking.id}`);
    } else {
      console.error(`Failed to send booking receipt to ${user.email} for booking ${booking.id}`);
    }

    return emailSent;
  } catch (error) {
    console.error('Error sending booking receipt:', error);
    return false;
  }
};

/**
 * Download booking receipt as PDF
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID requesting the receipt
 * @returns {Object} Result object with PDF buffer
 */
export const downloadBookingReceipt = async (bookingId, userId) => {
  try {
    console.log(`📄 Generating PDF receipt for booking ${bookingId}`);

    // Generate PDF
    const pdfBuffer = await generateBookingReceiptPDF(bookingId, userId);

    return {
      success: true,
      message: 'Receipt generated successfully',
      data: pdfBuffer,
      statusCode: 200
    };
  } catch (error) {
    console.error('Error downloading booking receipt:', error);

    if (error.message === 'Booking not found') {
      return {
        success: false,
        message: 'Booking not found',
        statusCode: 404
      };
    }

    if (error.message === 'Unauthorized access to booking') {
      return {
        success: false,
        message: 'You do not have permission to access this booking',
        statusCode: 403
      };
    }

    return {
      success: false,
      message: 'Failed to generate receipt',
      statusCode: 500
    };
  }
};
