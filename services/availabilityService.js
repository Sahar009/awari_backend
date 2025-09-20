import { PropertyAvailability, Property, Booking } from '../schema/index.js';
import { Op } from 'sequelize';

/**
 * Availability Service
 * Handles property availability management including blocking/unblocking dates
 */

/**
 * Get unavailable dates for a property within a date range
 * @param {string} propertyId - Property ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of unavailable dates
 */
export const getUnavailableDates = async (propertyId, startDate, endDate) => {
  try {
    const unavailableDates = await PropertyAvailability.findAll({
      where: {
        propertyId,
        date: {
          [Op.between]: [startDate, endDate]
        },
        isActive: true
      },
      order: [['date', 'ASC']]
    });

    return unavailableDates.map(record => ({
      date: record.date,
      reason: record.reason,
      notes: record.notes,
      bookingId: record.bookingId
    }));
  } catch (error) {
    console.error('Error getting unavailable dates:', error);
    throw new Error('Failed to get unavailable dates');
  }
};

/**
 * Get available dates for a property within a date range
 * @param {string} propertyId - Property ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of available dates
 */
export const getAvailableDates = async (propertyId, startDate, endDate) => {
  try {
    const unavailableDates = await getUnavailableDates(propertyId, startDate, endDate);
    const unavailableDateSet = new Set(unavailableDates.map(d => d.date));

    const availableDates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!unavailableDateSet.has(dateStr)) {
        availableDates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableDates;
  } catch (error) {
    console.error('Error getting available dates:', error);
    throw new Error('Failed to get available dates');
  }
};

/**
 * Check if a specific date is available for booking
 * @param {string} propertyId - Property ID
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if available, false otherwise
 */
export const isDateAvailable = async (propertyId, date) => {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    const unavailableRecord = await PropertyAvailability.findOne({
      where: {
        propertyId,
        date: dateStr,
        isActive: true
      }
    });

    return !unavailableRecord;
  } catch (error) {
    console.error('Error checking date availability:', error);
    throw new Error('Failed to check date availability');
  }
};

/**
 * Block a date for a property
 * @param {string} propertyId - Property ID
 * @param {Date|string} date - Date to block
 * @param {string} reason - Reason for blocking
 * @param {string} createdBy - User ID who created the block
 * @param {string} notes - Optional notes
 * @param {string} bookingId - Optional booking ID if reason is 'booking'
 * @returns {Object} Created availability record
 */
export const blockDate = async (propertyId, date, reason, createdBy, notes = null, bookingId = null) => {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    // Check if date is already blocked
    const existingBlock = await PropertyAvailability.findOne({
      where: {
        propertyId,
        date: dateStr,
        isActive: true
      }
    });

    if (existingBlock) {
      throw new Error('Date is already blocked');
    }

    const availabilityRecord = await PropertyAvailability.create({
      propertyId,
      date: dateStr,
      reason,
      bookingId,
      notes,
      createdBy,
      isActive: true
    });

    return availabilityRecord;
  } catch (error) {
    console.error('Error blocking date:', error);
    throw new Error('Failed to block date');
  }
};

/**
 * Unblock a date for a property
 * @param {string} propertyId - Property ID
 * @param {Date|string} date - Date to unblock
 * @returns {boolean} True if successfully unblocked
 */
export const unblockDate = async (propertyId, date) => {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

    const result = await PropertyAvailability.update(
      { isActive: false },
      {
        where: {
          propertyId,
          date: dateStr,
          isActive: true
        }
      }
    );

    return result[0] > 0;
  } catch (error) {
    console.error('Error unblocking date:', error);
    throw new Error('Failed to unblock date');
  }
};

/**
 * Block multiple dates for a property
 * @param {string} propertyId - Property ID
 * @param {Array} dates - Array of dates to block
 * @param {string} reason - Reason for blocking
 * @param {string} createdBy - User ID who created the blocks
 * @param {string} notes - Optional notes
 * @returns {Array} Array of created availability records
 */
export const blockMultipleDates = async (propertyId, dates, reason, createdBy, notes = null) => {
  try {
    const availabilityRecords = [];

    for (const date of dates) {
      try {
        const record = await blockDate(propertyId, date, reason, createdBy, notes);
        availabilityRecords.push(record);
      } catch (error) {
        // Skip if date is already blocked
        if (error.message === 'Date is already blocked') {
          continue;
        }
        throw error;
      }
    }

    return availabilityRecords;
  } catch (error) {
    console.error('Error blocking multiple dates:', error);
    throw new Error('Failed to block multiple dates');
  }
};

/**
 * Unblock multiple dates for a property
 * @param {string} propertyId - Property ID
 * @param {Array} dates - Array of dates to unblock
 * @returns {number} Number of dates successfully unblocked
 */
export const unblockMultipleDates = async (propertyId, dates) => {
  try {
    let unblockedCount = 0;

    for (const date of dates) {
      const success = await unblockDate(propertyId, date);
      if (success) unblockedCount++;
    }

    return unblockedCount;
  } catch (error) {
    console.error('Error unblocking multiple dates:', error);
    throw new Error('Failed to unblock multiple dates');
  }
};

/**
 * Block dates for a booking (called when booking is confirmed)
 * @param {string} propertyId - Property ID
 * @param {string} bookingId - Booking ID
 * @param {Date} checkInDate - Check-in date
 * @param {Date} checkOutDate - Check-out date
 * @param {string} createdBy - User ID who created the booking
 * @returns {Array} Array of created availability records
 */
export const blockDatesForBooking = async (propertyId, bookingId, checkInDate, checkOutDate, createdBy) => {
  try {
    const dates = [];
    const currentDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    // Generate all dates between check-in and check-out (exclusive of check-out)
    while (currentDate < endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return await blockMultipleDates(
      propertyId,
      dates,
      'booking',
      createdBy,
      `Blocked for booking ${bookingId}`,
      bookingId
    );
  } catch (error) {
    console.error('Error blocking dates for booking:', error);
    throw new Error('Failed to block dates for booking');
  }
};

/**
 * Unblock dates for a booking (called when booking is cancelled)
 * @param {string} propertyId - Property ID
 * @param {string} bookingId - Booking ID
 * @returns {number} Number of dates unblocked
 */
export const unblockDatesForBooking = async (propertyId, bookingId) => {
  try {
    const result = await PropertyAvailability.update(
      { isActive: false },
      {
        where: {
          propertyId,
          bookingId,
          isActive: true
        }
      }
    );

    return result[0];
  } catch (error) {
    console.error('Error unblocking dates for booking:', error);
    throw new Error('Failed to unblock dates for booking');
  }
};

/**
 * Get availability calendar for a property
 * @param {string} propertyId - Property ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Calendar data with available/unavailable dates
 */
export const getAvailabilityCalendar = async (propertyId, startDate, endDate) => {
  try {
    const [unavailableDates, property] = await Promise.all([
      getUnavailableDates(propertyId, startDate, endDate),
      Property.findByPk(propertyId, {
        attributes: ['id', 'title', 'minStayNights', 'maxStayNights', 'instantBooking']
      })
    ]);

    const unavailableDateSet = new Set(unavailableDates.map(d => d.date));
    const calendar = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isAvailable = !unavailableDateSet.has(dateStr);
      
      const unavailableRecord = unavailableDates.find(d => d.date === dateStr);
      
      calendar.push({
        date: dateStr,
        available: isAvailable,
        reason: unavailableRecord?.reason || null,
        notes: unavailableRecord?.notes || null,
        bookingId: unavailableRecord?.bookingId || null
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      property: {
        id: property.id,
        title: property.title,
        minStayNights: property.minStayNights,
        maxStayNights: property.maxStayNights,
        instantBooking: property.instantBooking
      },
      calendar
    };
  } catch (error) {
    console.error('Error getting availability calendar:', error);
    throw new Error('Failed to get availability calendar');
  }
};

/**
 * Check if a date range is available for booking
 * @param {string} propertyId - Property ID
 * @param {Date} checkInDate - Check-in date
 * @param {Date} checkOutDate - Check-out date
 * @returns {Object} Availability check result
 */
export const checkDateRangeAvailability = async (propertyId, checkInDate, checkOutDate) => {
  try {
    const unavailableDates = await getUnavailableDates(propertyId, checkInDate, checkOutDate);
    const unavailableDateSet = new Set(unavailableDates.map(d => d.date));

    const conflictingDates = [];
    const currentDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (unavailableDateSet.has(dateStr)) {
        const unavailableRecord = unavailableDates.find(d => d.date === dateStr);
        conflictingDates.push({
          date: dateStr,
          reason: unavailableRecord.reason,
          notes: unavailableRecord.notes
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      available: conflictingDates.length === 0,
      conflictingDates,
      totalNights: Math.ceil((endDate - checkInDate) / (1000 * 60 * 60 * 24))
    };
  } catch (error) {
    console.error('Error checking date range availability:', error);
    throw new Error('Failed to check date range availability');
  }
};

/**
 * Get all availability records for a property (for admin/owner management)
 * @param {string} propertyId - Property ID
 * @param {Object} options - Query options
 * @returns {Object} Paginated availability records
 */
export const getPropertyAvailabilityRecords = async (propertyId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      reason = null,
      startDate = null,
      endDate = null,
      includeInactive = false
    } = options;

    const whereClause = {
      propertyId
    };

    if (reason) {
      whereClause.reason = reason;
    }

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await PropertyAvailability.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Booking,
          as: 'booking',
          attributes: ['id', 'status', 'checkInDate', 'checkOutDate']
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      records: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting property availability records:', error);
    throw new Error('Failed to get property availability records');
  }
};


