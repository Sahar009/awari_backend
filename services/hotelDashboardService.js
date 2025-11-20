import { Op, fn, col, literal } from 'sequelize';
import Property from '../schema/Property.js';
import Booking from '../schema/Booking.js';
import Payment from '../schema/Payment.js';
import PropertyAvailability from '../schema/PropertyAvailability.js';
import User from '../schema/User.js';
import { confirmBooking, cancelBooking } from './bookingService.js';

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildPaginationMeta = (count, page, limit) => {
  const currentPage = Number(page) || 1;
  const perPage = Number(limit) || 10;
  const totalPages = Math.ceil(count / perPage) || 1;

  return {
    currentPage,
    totalPages,
    totalItems: count,
    itemsPerPage: perPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

export const getDashboardSummary = async (hotelId, options = {}) => {
  try {
    const { startDate, endDate } = options;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = startDate;
    if (endDate) dateFilter[Op.lte] = endDate;

    const baseBookingWhere = {
      ownerId: hotelId,
      bookingType: 'shortlet'
    };

    if (Object.keys(dateFilter).length) {
      baseBookingWhere.createdAt = dateFilter;
    }

    const [totalRooms, activeRooms, totalBookings, confirmedBookings, upcomingCheckins, revenue] =
      await Promise.all([
        Property.count({ where: { ownerId: hotelId, listingType: 'shortlet' } }),
        Property.count({ where: { ownerId: hotelId, listingType: 'shortlet', status: 'active' } }),
        Booking.count({ where: baseBookingWhere }),
        Booking.count({ where: { ...baseBookingWhere, status: 'confirmed' } }),
        Booking.count({
          where: {
            ...baseBookingWhere,
            status: 'confirmed',
            checkInDate: { [Op.gte]: new Date() }
          }
        }),
        Payment.sum('amount', {
          where: {
            status: 'completed',
            paymentType: 'booking',
            createdAt: dateFilter
          },
          include: [
            {
              model: Property,
              as: 'property',
              attributes: [],
              where: { ownerId: hotelId, listingType: 'shortlet' }
            }
          ]
        })
      ]);

    const occupancyRate =
      totalRooms > 0 ? Math.min(1, confirmedBookings / totalRooms) : 0;

    const monthlyRevenue = await Payment.findAll({
      where: {
        status: 'completed',
        paymentType: 'booking',
        createdAt: dateFilter
      },
      attributes: [
        [fn('DATE_FORMAT', col('Payment.createdAt'), '%Y-%m'), 'period'],
        [fn('SUM', col('amount')), 'totalAmount'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      include: [
        {
          model: Property,
          as: 'property',
          attributes: [],
          where: { ownerId: hotelId, listingType: 'shortlet' }
        }
      ],
      group: [literal('period')],
      order: [[literal('period'), 'ASC']]
    });

    const popularRooms = await Booking.findAll({
      where: baseBookingWhere,
      attributes: [
        'propertyId',
        [fn('COUNT', col('Booking.id')), 'bookingCount']
      ],
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'city', 'state', 'price', 'status']
        }
      ],
      group: ['propertyId', 'property.id'],
      order: [[literal('bookingCount'), 'DESC']],
      limit: 5
    });

    return {
      success: true,
      message: 'Hotel dashboard summary retrieved successfully',
      data: {
        metrics: {
          totalRooms,
          activeRooms,
          totalBookings,
          confirmedBookings,
          upcomingCheckins,
          occupancyRate: Number((occupancyRate * 100).toFixed(1)),
          totalRevenue: toNumber(revenue)
        },
        monthlyRevenue: monthlyRevenue.map((entry) => ({
          period: entry.get('period'),
          totalAmount: toNumber(entry.get('totalAmount')),
          transactions: Number(entry.get('transactions'))
        })),
        popularRooms: popularRooms.map((entry) => ({
          propertyId: entry.propertyId,
          bookingCount: Number(entry.get('bookingCount')),
          property: entry.property?.get({ plain: true })
        }))
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Hotel dashboard summary error:', error);
    return {
      success: false,
      message: 'Failed to retrieve hotel summary',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getRoomInventory = async (hotelId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      city,
      search
    } = options;

    const whereClause = {
      ownerId: hotelId,
      listingType: 'shortlet'
    };

    if (status) whereClause.status = status;
    if (city) whereClause.city = city;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Property.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'bookings',
          attributes: ['id', 'status', 'checkInDate', 'checkOutDate'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const rooms = rows.map((property) => {
      const plain = property.get({ plain: true });
      const upcomingBookings = (plain.bookings || []).filter(
        (booking) => booking.status === 'confirmed' && booking.checkInDate && new Date(booking.checkInDate) >= new Date()
      );

      return {
        ...plain,
        upcomingBookings,
        occupancy: upcomingBookings.length
      };
    });

    return {
      success: true,
      message: 'Room inventory retrieved successfully',
      data: {
        rooms,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Hotel room inventory error:', error);
    return {
      success: false,
      message: 'Failed to retrieve room inventory',
      error: error.message,
      statusCode: 500
    };
  }
};

export const updateRoomPricing = async (hotelId, propertyId, payload) => {
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    if (property.ownerId !== hotelId) {
      return {
        success: false,
        message: 'Unauthorized to update this property',
        statusCode: 403
      };
    }

    const allowedFields = ['price', 'originalPrice', 'pricePeriod', 'negotiable'];
    const updatePayload = {};

    allowedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        updatePayload[field] = payload[field];
      }
    });

    await property.update(updatePayload);

    const updatedProperty = await Property.findByPk(propertyId, {
      include: [
        {
          model: Booking,
          as: 'bookings',
          attributes: ['id', 'status', 'checkInDate', 'checkOutDate'],
          required: false
        }
      ]
    });

    return {
      success: true,
      message: 'Room pricing updated successfully',
      data: updatedProperty.get({ plain: true }),
      statusCode: 200
    };
  } catch (error) {
    console.error('Hotel update room pricing error:', error);
    return {
      success: false,
      message: 'Failed to update room pricing',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getHotelBookings = async (hotelId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const whereClause = {
      ownerId: hotelId,
      bookingType: 'shortlet'
    };

    if (status) whereClause.status = status;
    if (dateFrom || dateTo) {
      const dateRange = {};
      if (dateFrom) dateRange[Op.gte] = dateFrom;
      if (dateTo) dateRange[Op.lte] = dateTo;
      whereClause.createdAt = dateRange;
    }

    const allowedSort = ['createdAt', 'checkInDate', 'checkOutDate', 'status'];
    const normalizedSortBy = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'city', 'state', 'price', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [[normalizedSortBy, normalizedSortOrder]],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const bookings = rows.map((booking) => booking.get({ plain: true }));

    return {
      success: true,
      message: 'Hotel bookings retrieved successfully',
      data: {
        bookings,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Hotel bookings error:', error);
    return {
      success: false,
      message: 'Failed to retrieve hotel bookings',
      error: error.message,
      statusCode: 500
    };
  }
};

export const respondToHotelBooking = async (hotelId, bookingId, action, notes = null) => {
  try {
    if (action === 'approve') {
      return await confirmBooking(bookingId, hotelId, notes);
    }

    if (action === 'reject') {
      return await cancelBooking(bookingId, hotelId, notes || 'Booking cancelled by hotel provider');
    }

    if (['check_in', 'check_out'].includes(action)) {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return {
          success: false,
          message: 'Booking not found',
          statusCode: 404
        };
      }

      if (booking.ownerId !== hotelId) {
        return {
          success: false,
          message: 'Unauthorized to update this booking',
          statusCode: 403
        };
      }

      const nextStatus = action === 'check_in' ? 'checked_in' : 'completed';
      await booking.update({ status: nextStatus });

      const updatedBooking = await Booking.findByPk(bookingId, {
        include: [
          {
            model: Property,
            as: 'property',
            attributes: ['id', 'title', 'city', 'state']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
          }
        ]
      });

      return {
        success: true,
        message: `Booking marked as ${nextStatus.replace('_', ' ')}`,
        data: updatedBooking.get({ plain: true }),
        statusCode: 200
      };
    }

    return {
      success: false,
      message: 'Invalid action provided',
      statusCode: 400
    };
  } catch (error) {
    console.error('Hotel respond booking error:', error);
    return {
      success: false,
      message: 'Failed to update booking status',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getAvailabilityCalendar = async (hotelId, propertyId, options = {}) => {
  try {
    const { month, year } = options;

    const property = await Property.findByPk(propertyId);
    if (!property || property.ownerId !== hotelId) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    const whereClause = { propertyId };

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      whereClause.startDate = { [Op.between]: [start, end] };
    }

    const availability = await PropertyAvailability.findAll({
      where: whereClause,
      order: [['startDate', 'ASC']]
    });

    return {
      success: true,
      message: 'Availability retrieved successfully',
      data: availability.map((slot) => slot.get({ plain: true })),
      statusCode: 200
    };
  } catch (error) {
    console.error('Hotel availability error:', error);
    return {
      success: false,
      message: 'Failed to retrieve availability',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getHotelAnalytics = async (hotelId, options = {}) => {
  try {
    const analytics = await getDashboardSummary(hotelId, options);
    return analytics;
  } catch (error) {
    console.error('Hotel analytics error:', error);
    return {
      success: false,
      message: 'Failed to retrieve analytics',
      error: error.message,
      statusCode: 500
    };
  }
};




