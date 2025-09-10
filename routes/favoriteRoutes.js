import express from 'express';
import * as favoriteController from '../controllers/favoriteController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules
const propertyIdValidation = [
  param('propertyId')
    .isUUID()
    .withMessage('Property ID must be a valid UUID')
];

const addToFavoritesValidation = [
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be a string with maximum 1000 characters')
];

const updateNotesValidation = [
  body('notes')
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be a string with maximum 1000 characters')
];

const getFavoritesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('propertyType')
    .optional()
    .isIn(['apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'])
    .withMessage('Invalid property type'),
  query('listingType')
    .optional()
    .isIn(['rent', 'sale', 'shortlet'])
    .withMessage('Invalid listing type'),
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'rejected', 'archived'])
    .withMessage('Invalid status')
];

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get user's favorite properties
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of favorites per page
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [rent, sale, shortlet]
 *         description: Filter by listing type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, inactive, sold, rented, rejected, archived]
 *         description: Filter by property status
 *     responses:
 *       200:
 *         description: Favorites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     favorites:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FavoriteResponse'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', 
  authenticateToken, 
  getFavoritesValidation, 
  handleValidationErrors, 
  favoriteController.getUserFavorites
);

/**
 * @swagger
 * /api/favorites/{propertyId}:
 *   post:
 *     summary: Add a property to favorites
 *     tags: [Favorites]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes about this favorite
 *     responses:
 *       201:
 *         description: Property added to favorites successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Favorite'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 *       409:
 *         description: Property already in favorites
 *       500:
 *         description: Internal server error
 */
router.post('/:propertyId', 
  authenticateToken, 
  propertyIdValidation, 
  addToFavoritesValidation, 
  handleValidationErrors, 
  favoriteController.addToFavorites
);

/**
 * @swagger
 * /api/favorites/{propertyId}:
 *   delete:
 *     summary: Remove a property from favorites
 *     tags: [Favorites]
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
 *     responses:
 *       200:
 *         description: Property removed from favorites successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found in favorites
 *       500:
 *         description: Internal server error
 */
router.delete('/:propertyId', 
  authenticateToken, 
  propertyIdValidation, 
  handleValidationErrors, 
  favoriteController.removeFromFavorites
);

/**
 * @swagger
 * /api/favorites/{propertyId}/status:
 *   get:
 *     summary: Check if a property is favorited
 *     tags: [Favorites]
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
 *     responses:
 *       200:
 *         description: Favorite status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorited:
 *                       type: boolean
 *                     favoriteId:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     notes:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:propertyId/status', 
  authenticateToken, 
  propertyIdValidation, 
  handleValidationErrors, 
  favoriteController.checkFavoriteStatus
);

/**
 * @swagger
 * /api/favorites/{propertyId}/notes:
 *   put:
 *     summary: Update favorite notes
 *     tags: [Favorites]
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
 *               - notes
 *             properties:
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Notes about this favorite
 *     responses:
 *       200:
 *         description: Favorite notes updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Favorite'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found in favorites
 *       500:
 *         description: Internal server error
 */
router.put('/:propertyId/notes', 
  authenticateToken, 
  propertyIdValidation, 
  updateNotesValidation, 
  handleValidationErrors, 
  favoriteController.updateFavoriteNotes
);

/**
 * @swagger
 * /api/favorites/clear:
 *   delete:
 *     summary: Clear all user's favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All favorites cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     clearedCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/clear', 
  authenticateToken, 
  favoriteController.clearAllFavorites
);

export default router;
