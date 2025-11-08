import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import PropertyMedia from '../schema/PropertyMedia.js';
import User from '../schema/User.js';
import Payment from '../schema/Payment.js';
import { Op } from 'sequelize';

/**
 * Get user's rental applications
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getMyRentals = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    const whereClause = {
      userId,
      bookingType: 'rental'
    };

    if (status) {
      whereClause.status = status;
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
            },
            {
              model: PropertyMedia,
              as: 'media',
              where: { isActive: true, isPrimary: true },
              required: false,
              limit: 1
            }
          ]
        },
        {
          model: Payment,
          as: 'payments',
          required: false,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Rental applications retrieved successfully',
      data: {
        bookings: bookings.map(booking => ({
          ...booking.toJSON(),
          property: booking.property ? {
            ...booking.property.toJSON(),
            primaryImage: booking.property.media?.[0]?.url || null
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('Get my rentals error:', error);
    return {
      success: false,
      message: 'Failed to retrieve rental applications',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user's purchase-related data (inspections for sale properties)
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getMyPurchases = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    const whereClause = {
      userId,
      bookingType: 'sale_inspection'
    };

    if (status) {
      whereClause.status = status;
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
            },
            {
              model: PropertyMedia,
              as: 'media',
              where: { isActive: true, isPrimary: true },
              required: false,
              limit: 1
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get properties user has viewed (for sale properties)
    // Note: This is a simplified version. In production, you'd track views in a separate table
    const viewedProperties = await Property.findAll({
      where: {
        listingType: 'sale',
        viewCount: { [Op.gt]: 0 }
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: PropertyMedia,
          as: 'media',
          where: { isActive: true, isPrimary: true },
          required: false,
          limit: 1
        }
      ],
      limit: 20,
      order: [['updatedAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Purchase data retrieved successfully',
      data: {
        inspections: bookings.map(booking => ({
          ...booking.toJSON(),
          property: booking.property ? {
            ...booking.property.toJSON(),
            primaryImage: booking.property.media?.[0]?.url || null
          } : null
        })),
        viewedProperties: viewedProperties.map(property => ({
          ...property.toJSON(),
          primaryImage: property.media?.[0]?.url || null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('Get my purchases error:', error);
    return {
      success: false,
      message: 'Failed to retrieve purchase data',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user's shortlet bookings
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getMyShortletBookings = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    const whereClause = {
      userId,
      bookingType: 'shortlet'
    };

    if (status) {
      whereClause.status = status;
    }
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
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
            },
            {
              model: PropertyMedia,
              as: 'media',
              where: { isActive: true, isPrimary: true },
              required: false,
              limit: 1
            }
          ]
        },
        {
          model: Payment,
          as: 'payments',
          required: false,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Shortlet bookings retrieved successfully',
      data: {
        bookings: bookings.map(booking => ({
          ...booking.toJSON(),
          property: booking.property ? {
            ...booking.property.toJSON(),
            primaryImage: booking.property.media?.[0]?.url || null
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('Get my shortlet bookings error:', error);
    return {
      success: false,
      message: 'Failed to retrieve shortlet bookings',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user's payment statements
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} Result object
 */
export const getPaymentStatements = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      paymentType,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;

    const whereClause = {
      userId
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = startDate;
      if (endDate) whereClause.createdAt[Op.lte] = endDate;
    }

    if (paymentType) {
      whereClause.paymentType = paymentType;
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'title', 'address', 'city', 'state']
            }
          ],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate summary statistics
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const totalPages = Math.ceil(count / limit);

    return {
      success: true,
      message: 'Payment statements retrieved successfully',
      data: {
        payments: payments.map(payment => payment.toJSON()),
        summary: {
          totalPaid,
          totalPending,
          totalTransactions: count
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('Get payment statements error:', error);
    return {
      success: false,
      message: 'Failed to retrieve payment statements',
      error: error.message,
      statusCode: 500
    };
  }
};

/**
 * Get user dashboard overview statistics
 * @param {string} userId - User ID
 * @returns {Object} Result object
 */
export const getDashboardStats = async (userId) => {
  try {
    // Get rental applications count
    const rentalCount = await Booking.count({
      where: {
        userId,
        bookingType: 'rental'
      }
    });

    // Get purchase inspections count
    const purchaseCount = await Booking.count({
      where: {
        userId,
        bookingType: 'sale_inspection'
      }
    });

    // Get shortlet bookings count
    const shortletCount = await Booking.count({
      where: {
        userId,
        bookingType: 'shortlet'
      }
    });

    // Get pending payments
    const pendingPayments = await Payment.sum('amount', {
      where: {
        userId,
        status: 'pending'
      }
    }) || 0;

    // Get total spent
    const totalSpent = await Payment.sum('amount', {
      where: {
        userId,
        status: 'completed'
      }
    }) || 0;

    return {
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        rentals: {
          total: rentalCount,
          pending: await Booking.count({
            where: { userId, bookingType: 'rental', status: 'pending' }
          }),
          confirmed: await Booking.count({
            where: { userId, bookingType: 'rental', status: 'confirmed' }
          })
        },
        purchases: {
          total: purchaseCount,
          pending: await Booking.count({
            where: { userId, bookingType: 'sale_inspection', status: 'pending' }
          }),
          completed: await Booking.count({
            where: { userId, bookingType: 'sale_inspection', status: 'completed' }
          })
        },
        shortlets: {
          total: shortletCount,
          upcoming: await Booking.count({
            where: {
              userId,
              bookingType: 'shortlet',
              status: 'confirmed',
              checkInDate: { [Op.gte]: new Date() }
            }
          }),
          completed: await Booking.count({
            where: { userId, bookingType: 'shortlet', status: 'completed' }
          })
        },
        payments: {
          pending: parseFloat(pendingPayments),
          totalSpent: parseFloat(totalSpent)
        }
      }
    };
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return {
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message,
      statusCode: 500
    };
  }
};

