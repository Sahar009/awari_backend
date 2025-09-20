import express from 'express';
import {
  createReview,
  getReviewById,
  getReviews,
  updateReview,
  deleteReview,
  moderateReview,
  addOwnerResponse,
  markReviewHelpful,
  reportReview,
  getReviewStats,
  getPropertyRatingSummary,
  getUserReviewHistory,
  getPendingReviews,
  bulkModerateReviews
} from '../services/reviewService.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - reviewerId
 *         - reviewType
 *         - rating
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Review ID
 *         reviewerId:
 *           type: string
 *           format: uuid
 *           description: ID of user who wrote the review
 *         propertyId:
 *           type: string
 *           format: uuid
 *           description: Property being reviewed
 *         ownerId:
 *           type: string
 *           format: uuid
 *           description: Property owner being reviewed
 *         bookingId:
 *           type: string
 *           format: uuid
 *           description: Booking associated with review
 *         reviewType:
 *           type: string
 *           enum: [property, owner, guest, platform]
 *           description: Type of review
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Overall rating
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Review title
 *         content:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           description: Review content
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 *           description: Review status
 *         cleanliness:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Cleanliness rating
 *         communication:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Communication rating
 *         checkIn:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Check-in experience rating
 *         accuracy:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Accuracy rating
 *         location:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Location rating
 *         value:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Value for money rating
 *         helpfulCount:
 *           type: integer
 *           description: Number of helpful votes
 *         reportCount:
 *           type: integer
 *           description: Number of reports
 *         isVerified:
 *           type: boolean
 *           description: Whether review is verified
 *         ownerResponse:
 *           type: string
 *           description: Owner's response to review
 *         ownerResponseAt:
 *           type: string
 *           format: date-time
 *           description: When owner responded
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     
 *     ReviewStats:
 *       type: object
 *       properties:
 *         totalReviews:
 *           type: integer
 *           description: Total number of reviews
 *         approvedReviews:
 *           type: integer
 *           description: Number of approved reviews
 *         pendingReviews:
 *           type: integer
 *           description: Number of pending reviews
 *         rejectedReviews:
 *           type: integer
 *           description: Number of rejected reviews
 *         hiddenReviews:
 *           type: integer
 *           description: Number of hidden reviews
 *         averageRating:
 *           type: number
 *           description: Average rating
 *         ratingDistribution:
 *           type: object
 *           description: Distribution of ratings
 *     
 *     ReviewResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Success status
 *         message:
 *           type: string
 *           description: Response message
 *         data:
 *           type: object
 *           description: Response data
 *         error:
 *           type: string
 *           description: Error message
 *     
 *     ModerationRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected, hidden]
 *           description: Moderation status
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection
 *     
 *     OwnerResponseRequest:
 *       type: object
 *       required:
 *         - response
 *       properties:
 *         response:
 *           type: string
 *           description: Owner's response text
 *     
 *     ReportRequest:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         reason:
 *           type: string
 *           description: Reason for reporting
 *         description:
 *           type: string
 *           description: Additional details
 */

/**
 * @swagger
 * tags:
 *   - name: Reviews
 *     description: Review management endpoints
 */

// Validation middleware
const validateReview = [
  body('reviewType').isIn(['property', 'owner', 'guest', 'platform']).withMessage('Invalid review type'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().isLength({ max: 200 }).withMessage('Title too long'),
  body('content').isLength({ min: 10, max: 2000 }).withMessage('Content must be between 10 and 2000 characters'),
  body('cleanliness').optional().isInt({ min: 1, max: 5 }).withMessage('Cleanliness rating must be between 1 and 5'),
  body('communication').optional().isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1 and 5'),
  body('checkIn').optional().isInt({ min: 1, max: 5 }).withMessage('Check-in rating must be between 1 and 5'),
  body('accuracy').optional().isInt({ min: 1, max: 5 }).withMessage('Accuracy rating must be between 1 and 5'),
  body('location').optional().isInt({ min: 1, max: 5 }).withMessage('Location rating must be between 1 and 5'),
  body('value').optional().isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1 and 5'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Review'
 *           example:
 *             propertyId: "123e4567-e89b-12d3-a456-426614174000"
 *             bookingId: "123e4567-e89b-12d3-a456-426614174001"
 *             reviewType: "property"
 *             rating: 5
 *             title: "Amazing stay!"
 *             content: "Had an absolutely wonderful time. The property was clean, well-equipped, and in a great location."
 *             cleanliness: 5
 *             communication: 5
 *             checkIn: 4
 *             accuracy: 5
 *             location: 5
 *             value: 5
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, validateReview, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      reviewerId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const review = await createReview(reviewData);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get reviews with filtering and pagination
 *     tags: [Reviews]
 *     parameters:
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
 *         description: Items per page
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by property ID
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by owner ID
 *       - in: query
 *         name: reviewerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by reviewer ID
 *       - in: query
 *         name: reviewType
 *         schema:
 *           type: string
 *           enum: [property, owner, guest, platform]
 *         description: Filter by review type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 *         description: Filter by status
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by exact rating
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Maximum rating filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and content
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const result = await getReviews(req.query);

    res.json({
      success: true,
      message: 'Reviews retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.get('/:reviewId', param('reviewId').isUUID().withMessage('Invalid review ID'), async (req, res) => {
  try {
    const review = await getReviewById(req.params.reviewId);

    res.json({
      success: true,
      message: 'Review retrieved successfully',
      data: review
    });
  } catch (error) {
    const statusCode = error.message === 'Review not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   put:
 *     summary: Update review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               cleanliness:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               communication:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               checkIn:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               accuracy:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               location:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.put('/:reviewId', authenticateToken, param('reviewId').isUUID().withMessage('Invalid review ID'), async (req, res) => {
  try {
    const review = await updateReview(req.params.reviewId, req.body, req.user.id, req.user.role);

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (error) {
    const statusCode = error.message === 'Review not found' ? 404 : 
                      error.message.includes('permission') || error.message.includes('update') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:reviewId', authenticateToken, param('reviewId').isUUID().withMessage('Invalid review ID'), async (req, res) => {
  try {
    const result = await deleteReview(req.params.reviewId, req.user.id, req.user.role);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message === 'Review not found' ? 404 : 
                      error.message.includes('permission') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}/moderate:
 *   patch:
 *     summary: Moderate review (admin/moderator only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationRequest'
 *     responses:
 *       200:
 *         description: Review moderated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:reviewId/moderate', authenticateToken, requireRole(['admin', 'moderator']), 
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('status').isIn(['approved', 'rejected', 'hidden']).withMessage('Invalid moderation status'),
  async (req, res) => {
    try {
      const review = await moderateReview(req.params.reviewId, req.body, req.user.id);

      res.json({
        success: true,
        message: 'Review moderated successfully',
        data: review
      });
    } catch (error) {
      const statusCode = error.message === 'Review not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}/response:
 *   post:
 *     summary: Add owner response to review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OwnerResponseRequest'
 *     responses:
 *       200:
 *         description: Response added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.post('/:reviewId/response', authenticateToken, 
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('response').notEmpty().withMessage('Response is required'),
  async (req, res) => {
    try {
      const review = await addOwnerResponse(req.params.reviewId, req.body.response, req.user.id);

      res.json({
        success: true,
        message: 'Response added successfully',
        data: review
      });
    } catch (error) {
      const statusCode = error.message === 'Review not found' ? 404 : 
                        error.message.includes('owner') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review marked as helpful
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.post('/:reviewId/helpful', authenticateToken, param('reviewId').isUUID().withMessage('Invalid review ID'), async (req, res) => {
  try {
    const result = await markReviewHelpful(req.params.reviewId, req.user.id);

    res.json({
      success: true,
      message: result.message,
      data: { helpfulCount: result.helpfulCount }
    });
  } catch (error) {
    const statusCode = error.message === 'Review not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/{reviewId}/report:
 *   post:
 *     summary: Report review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportRequest'
 *     responses:
 *       200:
 *         description: Review reported successfully
 *       404:
 *         description: Review not found
 *       500:
 *         description: Internal server error
 */
router.post('/:reviewId/report', authenticateToken, 
  param('reviewId').isUUID().withMessage('Invalid review ID'),
  body('reason').notEmpty().withMessage('Report reason is required'),
  async (req, res) => {
    try {
      const result = await reportReview(req.params.reviewId, req.body, req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const statusCode = error.message === 'Review not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/reviews/stats:
 *   get:
 *     summary: Get review statistics
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by property ID
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by owner ID
 *       - in: query
 *         name: reviewType
 *         schema:
 *           type: string
 *           enum: [property, owner, guest, platform]
 *         description: Filter by review type
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getReviewStats(req.query);

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/property/{propertyId}/summary:
 *   get:
 *     summary: Get property rating summary
 *     tags: [Reviews]
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
 *         description: Property summary retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/property/:propertyId/summary', param('propertyId').isUUID().withMessage('Invalid property ID'), async (req, res) => {
  try {
    const summary = await getPropertyRatingSummary(req.params.propertyId);

    res.json({
      success: true,
      message: 'Property summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Get user's review history
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, hidden]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: User reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', authenticateToken, param('userId').isUUID().withMessage('Invalid user ID'), async (req, res) => {
  try {
    // Check if user can access these reviews
    if (req.user.id !== req.params.userId && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own review history'
      });
    }

    const result = await getUserReviewHistory(req.params.userId, req.query);

    res.json({
      success: true,
      message: 'User reviews retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/pending:
 *   get:
 *     summary: Get reviews pending moderation (admin/moderator only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Items per page
 *       - in: query
 *         name: reviewType
 *         schema:
 *           type: string
 *           enum: [property, owner, guest, platform]
 *         description: Filter by review type
 *     responses:
 *       200:
 *         description: Pending reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/pending', authenticateToken, requireRole(['admin', 'moderator']), async (req, res) => {
  try {
    const result = await getPendingReviews(req.query);

    res.json({
      success: true,
      message: 'Pending reviews retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/reviews/bulk/moderate:
 *   patch:
 *     summary: Bulk moderate reviews (admin/moderator only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reviewIds
 *               - status
 *             properties:
 *               reviewIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of review IDs
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, hidden]
 *                 description: Moderation status
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Reviews moderated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.patch('/bulk/moderate', authenticateToken, requireRole(['admin', 'moderator']), 
  body('reviewIds').isArray().withMessage('Review IDs must be an array'),
  body('status').isIn(['approved', 'rejected', 'hidden']).withMessage('Invalid moderation status'),
  async (req, res) => {
    try {
      const result = await bulkModerateReviews(req.body.reviewIds, req.body, req.user.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
        error: error.message
      });
    }
  }
);

export default router;
