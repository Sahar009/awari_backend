import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  getAvailabilityCalendar,
  getUnavailableDates,
  getAvailableDates,
  blockDate,
  unblockDate,
  blockMultipleDates,
  unblockMultipleDates,
  getPropertyAvailabilityRecords,
  checkDateRangeAvailability
} from '../services/availabilityService.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PropertyAvailability:
 *       type: object
 *       required:
 *         - propertyId
 *         - date
 *         - reason
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Availability record ID
 *         propertyId:
 *           type: string
 *           format: uuid
 *           description: Property ID
 *         date:
 *           type: string
 *           format: date
 *           description: Unavailable date
 *         reason:
 *           type: string
 *           enum: [booking, maintenance, owner_blocked, admin_blocked, unavailable]
 *           description: Reason for unavailability
 *         bookingId:
 *           type: string
 *           format: uuid
 *           description: Associated booking ID (if reason is booking)
 *         notes:
 *           type: string
 *           description: Additional notes
 *         isActive:
 *           type: boolean
 *           description: Whether the availability record is active
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: User who created the record
 */

/**
 * @swagger
 * /api/availability/calendar/{propertyId}:
 *   get:
 *     summary: Get availability calendar for a property
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Availability calendar retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     property:
 *                       $ref: '#/components/schemas/Property'
 *                     calendar:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           available:
 *                             type: boolean
 *                           reason:
 *                             type: string
 *                           notes:
 *                             type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get('/calendar/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const calendar = await getAvailabilityCalendar(propertyId, startDate, endDate);

    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error getting availability calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get availability calendar',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/unavailable/{propertyId}:
 *   get:
 *     summary: Get unavailable dates for a property
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Unavailable dates retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/unavailable/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const unavailableDates = await getUnavailableDates(propertyId, startDate, endDate);

    res.json({
      success: true,
      data: unavailableDates
    });
  } catch (error) {
    console.error('Error getting unavailable dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unavailable dates',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/available/{propertyId}:
 *   get:
 *     summary: Get available dates for a property
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available dates retrieved successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get('/available/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const availableDates = await getAvailableDates(propertyId, startDate, endDate);

    res.json({
      success: true,
      data: availableDates
    });
  } catch (error) {
    console.error('Error getting available dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available dates',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/check/{propertyId}:
 *   post:
 *     summary: Check if a date range is available for booking
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkInDate
 *               - checkOutDate
 *             properties:
 *               checkInDate:
 *                 type: string
 *                 format: date
 *                 description: Check-in date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *                 description: Check-out date
 *     responses:
 *       200:
 *         description: Availability check completed
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/check/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { checkInDate, checkOutDate } = req.body;

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date and check-out date are required'
      });
    }

    const availabilityCheck = await checkDateRangeAvailability(propertyId, checkInDate, checkOutDate);

    res.json({
      success: true,
      data: availabilityCheck
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/block/{propertyId}:
 *   post:
 *     summary: Block a date for a property (owner/admin only)
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - reason
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date to block
 *               reason:
 *                 type: string
 *                 enum: [maintenance, owner_blocked, admin_blocked, unavailable]
 *                 description: Reason for blocking
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Date blocked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/block/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { date, reason, notes } = req.body;
    const userId = req.user.id;

    if (!date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Date and reason are required'
      });
    }

    const validReasons = ['maintenance', 'owner_blocked', 'admin_blocked', 'unavailable'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reason. Must be one of: ' + validReasons.join(', ')
      });
    }

    const availabilityRecord = await blockDate(propertyId, date, reason, userId, notes);

    res.json({
      success: true,
      message: 'Date blocked successfully',
      data: availabilityRecord
    });
  } catch (error) {
    console.error('Error blocking date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block date',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/unblock/{propertyId}:
 *   delete:
 *     summary: Unblock a date for a property (owner/admin only)
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to unblock
 *     responses:
 *       200:
 *         description: Date unblocked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.delete('/unblock/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { date } = req.query;
    const userId = req.user.id;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const success = await unblockDate(propertyId, date);

    if (success) {
      res.json({
        success: true,
        message: 'Date unblocked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No active block found for this date'
      });
    }
  } catch (error) {
    console.error('Error unblocking date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock date',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/block-multiple/{propertyId}:
 *   post:
 *     summary: Block multiple dates for a property (owner/admin only)
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dates
 *               - reason
 *             properties:
 *               dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *                 description: Array of dates to block
 *               reason:
 *                 type: string
 *                 enum: [maintenance, owner_blocked, admin_blocked, unavailable]
 *                 description: Reason for blocking
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Dates blocked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/block-multiple/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { dates, reason, notes } = req.body;
    const userId = req.user.id;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates array is required and must not be empty'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    const validReasons = ['maintenance', 'owner_blocked', 'admin_blocked', 'unavailable'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reason. Must be one of: ' + validReasons.join(', ')
      });
    }

    const availabilityRecords = await blockMultipleDates(propertyId, dates, reason, userId, notes);

    res.json({
      success: true,
      message: `${availabilityRecords.length} dates blocked successfully`,
      data: availabilityRecords
    });
  } catch (error) {
    console.error('Error blocking multiple dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block multiple dates',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/unblock-multiple/{propertyId}:
 *   delete:
 *     summary: Unblock multiple dates for a property (owner/admin only)
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dates
 *             properties:
 *               dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *                 description: Array of dates to unblock
 *     responses:
 *       200:
 *         description: Dates unblocked successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.delete('/unblock-multiple/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { dates } = req.body;
    const userId = req.user.id;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dates array is required and must not be empty'
      });
    }

    const unblockedCount = await unblockMultipleDates(propertyId, dates);

    res.json({
      success: true,
      message: `${unblockedCount} dates unblocked successfully`,
      data: { unblockedCount }
    });
  } catch (error) {
    console.error('Error unblocking multiple dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock multiple dates',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/availability/records/{propertyId}:
 *   get:
 *     summary: Get availability records for a property (owner/admin only)
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: reason
 *         schema:
 *           type: string
 *           enum: [booking, maintenance, owner_blocked, admin_blocked, unavailable]
 *         description: Filter by reason
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive records
 *     responses:
 *       200:
 *         description: Availability records retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/records/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const {
      page = 1,
      limit = 20,
      reason,
      startDate,
      endDate,
      includeInactive = false
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      reason,
      startDate,
      endDate,
      includeInactive: includeInactive === 'true'
    };

    const result = await getPropertyAvailabilityRecords(propertyId, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting availability records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get availability records',
      error: error.message
    });
  }
});

export default router;


