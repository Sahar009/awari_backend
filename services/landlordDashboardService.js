import { Op } from 'sequelize';
import Payment from '../schema/Payment.js';
import Booking from '../schema/Booking.js';
import Property from '../schema/Property.js';
import Message from '../schema/Message.js';
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

export const getEarningsSummary = async (landlordId, options = {}) => {
  try {
    const { startDate, endDate } = options;

    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = startDate;
    if (endDate) dateFilter[Op.lte] = endDate;

    const baseWhere = { status: 'completed' };
    if (Object.keys(dateFilter).length) {
      baseWhere.createdAt = dateFilter;
    }

    const payments = await Payment.findAll({
      where: baseWhere,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType', 'city', 'state', 'address'],
          where: { ownerId: landlordId },
          required: true
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'checkInDate', 'checkOutDate', 'status']
        }
      ],
      attributes: [
        'id',
        'amount',
        'currency',
        'paymentType',
        'paymentMethod',
        'status',
        'payoutStatus',
        'payoutAmount',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    const paymentsPlain = payments.map((payment) => payment.get({ plain: true }));

    const totalEarnings = paymentsPlain.reduce((sum, payment) => sum + toNumber(payment.payoutAmount ?? payment.amount), 0);
    const pendingPayouts = paymentsPlain
      .filter((payment) => ['pending', 'processing'].includes(payment.payoutStatus))
      .reduce((sum, payment) => sum + toNumber(payment.payoutAmount ?? payment.amount), 0);
    const totalCompletedPayments = paymentsPlain.length;

    const monthlyBreakdownMap = paymentsPlain.reduce((acc, payment) => {
      const monthKey = payment.createdAt ? payment.createdAt.toISOString().slice(0, 7) : 'unknown';
      if (!acc.has(monthKey)) {
        acc.set(monthKey, {
          period: monthKey,
          totalAmount: 0,
          completedPayments: 0
        });
      }

      const entry = acc.get(monthKey);
      entry.totalAmount += toNumber(payment.payoutAmount ?? payment.amount);
      entry.completedPayments += 1;
      acc.set(monthKey, entry);
      return acc;
    }, new Map());

    const monthlyBreakdown = Array.from(monthlyBreakdownMap.values()).sort((a, b) => a.period.localeCompare(b.period));

    const propertyMap = paymentsPlain.reduce((acc, payment) => {
      if (!payment.property) return acc;
      const key = payment.property.id;
      if (!acc.has(key)) {
        acc.set(key, {
          propertyId: payment.property.id,
          title: payment.property.title,
          listingType: payment.property.listingType,
          city: payment.property.city,
          state: payment.property.state,
          totalAmount: 0,
          transactionCount: 0
        });
      }
      const entry = acc.get(key);
      entry.totalAmount += toNumber(payment.payoutAmount ?? payment.amount);
      entry.transactionCount += 1;
      acc.set(key, entry);
      return acc;
    }, new Map());

    const topProperties = Array.from(propertyMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    const recentTransactions = paymentsPlain.slice(0, 5).map((payment) => ({
      id: payment.id,
      amount: toNumber(payment.payoutAmount ?? payment.amount),
      currency: payment.currency,
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      payoutStatus: payment.payoutStatus,
      createdAt: payment.createdAt,
      property: payment.property,
      booking: payment.booking
    }));

    const [totalBookings, confirmedBookings, pendingBookings, activeListings] = await Promise.all([
      Booking.count({ where: { ownerId: landlordId } }),
      Booking.count({ where: { ownerId: landlordId, status: 'confirmed' } }),
      Booking.count({ where: { ownerId: landlordId, status: 'pending' } }),
      Property.count({ where: { ownerId: landlordId, status: 'active' } })
    ]);

    return {
      success: true,
      message: 'Earnings summary retrieved successfully',
      data: {
        totals: {
          totalEarnings,
          pendingPayouts,
          totalCompletedPayments
        },
        metrics: {
          totalBookings,
          confirmedBookings,
          pendingBookings,
          activeListings
        },
        monthlyBreakdown,
        topProperties,
        recentTransactions
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord earnings summary error:', error);
    return {
      success: false,
      message: 'Failed to retrieve earnings summary',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getPaymentLogs = async (landlordId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      payoutStatus,
      paymentType,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const allowedSortFields = ['createdAt', 'amount', 'status', 'paymentType', 'payoutStatus'];
    const normalizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = {};
    if (status) whereClause.status = status;
    if (payoutStatus) whereClause.payoutStatus = payoutStatus;
    if (paymentType) whereClause.paymentType = paymentType;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType', 'city', 'state'],
          where: { ownerId: landlordId },
          required: true
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'status', 'checkInDate', 'checkOutDate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      order: [[normalizedSortBy, normalizedSortOrder]],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const payments = rows.map((payment) => payment.get({ plain: true }));

    return {
      success: true,
      message: 'Payment logs retrieved successfully',
      data: {
        payments,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord payment logs error:', error);
    return {
      success: false,
      message: 'Failed to retrieve payment logs',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getInspectionSchedule = async (landlordId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      bookingType,
      dateFrom,
      dateTo
    } = options;

    const whereClause = {
      ownerId: landlordId
    };

    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { [Op.in]: ['pending', 'confirmed'] };
    }

    if (bookingType) {
      whereClause.bookingType = bookingType;
    }

    if (dateFrom || dateTo) {
      whereClause[Op.or] = [];
      const dateRange = {};
      if (dateFrom) dateRange[Op.gte] = dateFrom;
      if (dateTo) dateRange[Op.lte] = dateTo;

      whereClause[Op.or].push({ checkInDate: dateRange });
      whereClause[Op.or].push({ inspectionDate: dateRange });
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType', 'address', 'city', 'state']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const bookings = rows.map((booking) => booking.get({ plain: true }));

    return {
      success: true,
      message: 'Inspection schedule retrieved successfully',
      data: {
        bookings,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord inspection schedule error:', error);
    return {
      success: false,
      message: 'Failed to retrieve inspection schedule',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getBookingRequests = async (landlordId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      bookingType,
      dateFrom,
      dateTo
    } = options;

    const whereClause = {
      ownerId: landlordId,
      status: 'pending'
    };

    if (bookingType) {
      whereClause.bookingType = bookingType;
    }

    if (dateFrom || dateTo) {
      const dateRange = {};
      if (dateFrom) dateRange[Op.gte] = dateFrom;
      if (dateTo) dateRange[Op.lte] = dateTo;
      whereClause.createdAt = dateRange;
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType', 'address', 'city', 'state']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const bookingRequests = rows.map((booking) => booking.get({ plain: true }));

    return {
      success: true,
      message: 'Booking requests retrieved successfully',
      data: {
        bookingRequests,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord booking requests error:', error);
    return {
      success: false,
      message: 'Failed to retrieve booking requests',
      error: error.message,
      statusCode: 500
    };
  }
};

export const respondToBookingRequest = async (landlordId, bookingId, action, ownerNotes = null) => {
  try {
    if (action === 'approve') {
      return await confirmBooking(bookingId, landlordId, ownerNotes);
    }

    if (action === 'reject') {
      return await cancelBooking(bookingId, landlordId, ownerNotes || 'Booking rejected by property owner');
    }

    return {
      success: false,
      message: 'Invalid action provided',
      statusCode: 400
    };
  } catch (error) {
    console.error('Landlord respond booking request error:', error);
    return {
      success: false,
      message: 'Failed to process booking request',
      error: error.message,
      statusCode: 500
    };
  }
};

export const getClientInquiries = async (landlordId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      onlyUnread = false
    } = options;

    const includeOnlyUnread = typeof onlyUnread === 'string'
      ? ['true', '1'].includes(onlyUnread.toLowerCase())
      : Boolean(onlyUnread);

    const whereClause = {
      receiverId: landlordId
    };

    if (status) {
      whereClause.status = status;
    } else if (!includeOnlyUnread) {
      whereClause.status = { [Op.ne]: 'archived' };
    }

    if (includeOnlyUnread) {
      whereClause.status = { [Op.notIn]: ['archived'] };
      whereClause.readAt = { [Op.is]: null };
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Message.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'listingType']
        },
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'bookingType', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    const inquiries = rows.map((message) => message.get({ plain: true }));

    return {
      success: true,
      message: 'Client inquiries retrieved successfully',
      data: {
        inquiries,
        pagination: buildPaginationMeta(count, page, limit)
      },
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord client inquiries error:', error);
    return {
      success: false,
      message: 'Failed to retrieve client inquiries',
      error: error.message,
      statusCode: 500
    };
  }
};

export const archiveInquiry = async (landlordId, messageId) => {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      return {
        success: false,
        message: 'Inquiry not found',
        statusCode: 404
      };
    }

    if (message.receiverId !== landlordId) {
      return {
        success: false,
        message: 'Unauthorized to update this inquiry',
        statusCode: 403
      };
    }

    await message.update({
      status: 'archived',
      readAt: message.readAt || new Date()
    });

    return {
      success: true,
      message: 'Inquiry archived successfully',
      data: message.get({ plain: true }),
      statusCode: 200
    };
  } catch (error) {
    console.error('Landlord archive inquiry error:', error);
    return {
      success: false,
      message: 'Failed to archive inquiry',
      error: error.message,
      statusCode: 500
    };
  }
};


