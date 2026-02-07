const express = require('express');
const router = express.Router();
const {
  getLandlordInspections,
  respondToInspection,
  getInspectionStats
} = require('../controllers/landlordInspectionController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/landlord/inspections
 * @desc    Get all inspections for a landlord's properties
 * @access  Private (Landlord, Agent, Hotel Provider, Admin)
 */
router.get('/', getLandlordInspections);

/**
 * @route   POST /api/landlord/inspections/:inspectionId/respond
 * @desc    Respond to an inspection request (approve/reject)
 * @access  Private (Landlord, Agent, Hotel Provider, Admin)
 */
router.post('/:inspectionId/respond', respondToInspection);

/**
 * @route   GET /api/landlord/inspections/stats
 * @desc    Get inspection statistics for a landlord
 * @access  Private (Landlord, Agent, Hotel Provider, Admin)
 */
router.get('/stats', getInspectionStats);

module.exports = router;
