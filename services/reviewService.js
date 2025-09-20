import { Review, User, Property, Booking } from '../schema/index.js';
import { Op } from 'sequelize';
import { sendTemplateNotification } from './notificationService.js';

/**
 * Create a new review
 */
export const createReview = async (reviewData) => {
  try {
    const {
      reviewerId,
      propertyId,
      ownerId,
      bookingId,
      reviewType,
      rating,
      title,
      content,
      cleanliness,
      communication,
      checkIn,
      accuracy,
      location,
      value,
      ipAddress,
      userAgent,
      metadata
    } = reviewData;

    // Validate that the reviewer exists
    const reviewer = await User.findByPk(reviewerId);
    if (!reviewer) {
      throw new Error('Reviewer not found');
    }

    // Check if user has already reviewed this item
    const existingReview = await Review.findOne({
      where: {
        reviewerId,
        ...(propertyId && { propertyId }),
        ...(ownerId && { ownerId }),
        ...(bookingId && { bookingId })
      }
    });

    if (existingReview) {
      throw new Error('You have already reviewed this item');
    }

    // Validate booking exists and user has permission to review
    if (bookingId) {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          { model: Property, as: 'property' },
          { model: User, as: 'user' }
        ]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId !== reviewerId) {
        throw new Error('You can only review your own bookings');
      }

      if (booking.status !== 'completed') {
        throw new Error('You can only review completed bookings');
      }

      // Set propertyId and ownerId from booking if not provided
      if (!propertyId && booking.propertyId) {
        reviewData.propertyId = booking.propertyId;
      }
      if (!ownerId && booking.ownerId) {
        reviewData.ownerId = booking.ownerId;
      }
    }

    // Validate property exists
    if (propertyId) {
      const property = await Property.findByPk(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }
    }

    // Validate owner exists
    if (ownerId) {
      const owner = await User.findByPk(ownerId);
      if (!owner) {
        throw new Error('Owner not found');
      }
    }

    // Calculate average rating if sub-ratings provided
    const subRatings = [cleanliness, communication, checkIn, accuracy, location, value].filter(r => r !== null && r !== undefined);
    if (subRatings.length > 0 && !rating) {
      reviewData.rating = Math.round(subRatings.reduce((sum, r) => sum + r, 0) / subRatings.length);
    }

    const review = await Review.create({
      ...reviewData,
      ipAddress,
      userAgent,
      metadata
    });

    // Send notification to property owner
    if (propertyId && ownerId) {
      try {
        await sendTemplateNotification('REVIEW_RECEIVED', ownerId, {
          review: review,
          property: propertyId,
          reviewer: reviewer
        });
      } catch (notificationError) {
        console.error('Failed to send review notification:', notificationError.message);
      }
    }

    return await getReviewById(review.id);
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
};

/**
 * Get review by ID with full details
 */
export const getReviewById = async (reviewId) => {
  try {
    const review = await Review.findByPk(reviewId, {
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'address', 'city', 'state'] },
        { model: Booking, as: 'booking', attributes: ['id', 'checkInDate', 'checkOutDate'] },
        { model: User, as: 'moderator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!review) {
      throw new Error('Review not found');
    }

    return review;
  } catch (error) {
    console.error('Error getting review by ID:', error);
    throw error;
  }
};

/**
 * Get reviews with filtering, pagination, and sorting
 */
export const getReviews = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      propertyId,
      ownerId,
      reviewerId,
      reviewType,
      status = 'approved',
      rating,
      minRating,
      maxRating,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      includeHidden = false
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    // Build where conditions
    if (propertyId) where.propertyId = propertyId;
    if (ownerId) where.ownerId = ownerId;
    if (reviewerId) where.reviewerId = reviewerId;
    if (reviewType) where.reviewType = reviewType;
    if (status) where.status = status;
    if (rating) where.rating = rating;
    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) where.rating[Op.gte] = minRating;
      if (maxRating) where.rating[Op.lte] = maxRating;
    }

    // Exclude hidden reviews unless specifically requested
    if (!includeHidden) {
      where.status = { [Op.ne]: 'hidden' };
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'address', 'city', 'state'] },
        { model: Booking, as: 'booking', attributes: ['id', 'checkInDate', 'checkOutDate'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting reviews:', error);
    throw error;
  }
};

/**
 * Update review (only by reviewer or admin)
 */
export const updateReview = async (reviewId, updateData, userId, userRole) => {
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Check permissions
    if (review.reviewerId !== userId && !['admin', 'moderator'].includes(userRole)) {
      throw new Error('You can only update your own reviews');
    }

    // Prevent updating approved reviews unless admin/moderator
    if (review.status === 'approved' && !['admin', 'moderator'].includes(userRole)) {
      throw new Error('Cannot update approved reviews');
    }

    // Recalculate rating if sub-ratings updated
    const { cleanliness, communication, checkIn, accuracy, location, value } = updateData;
    const subRatings = [cleanliness, communication, checkIn, accuracy, location, value].filter(r => r !== null && r !== undefined);
    if (subRatings.length > 0 && !updateData.rating) {
      updateData.rating = Math.round(subRatings.reduce((sum, r) => sum + r, 0) / subRatings.length);
    }

    await review.update(updateData);
    return await getReviewById(reviewId);
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
};

/**
 * Delete review (soft delete)
 */
export const deleteReview = async (reviewId, userId, userRole) => {
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Check permissions
    if (review.reviewerId !== userId && !['admin', 'moderator'].includes(userRole)) {
      throw new Error('You can only delete your own reviews');
    }

    // Soft delete by setting status to hidden
    await review.update({ status: 'hidden' });
    
    return { message: 'Review deleted successfully' };
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
};

/**
 * Moderate review (approve/reject/hide)
 */
export const moderateReview = async (reviewId, moderationData, moderatorId) => {
  try {
    const { status, rejectionReason } = moderationData;
    
    if (!['approved', 'rejected', 'hidden'].includes(status)) {
      throw new Error('Invalid moderation status');
    }

    const review = await Review.findByPk(reviewId, {
      include: [
        { model: User, as: 'reviewer' },
        { model: Property, as: 'property' }
      ]
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const updateData = {
      status,
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await review.update(updateData);

    // Send notification to reviewer
    try {
      if (status === 'approved') {
        await sendTemplateNotification('REVIEW_APPROVED', review.reviewerId, {
          review: review,
          property: review.property
        });
      } else if (status === 'rejected') {
        await sendTemplateNotification('REVIEW_REJECTED', review.reviewerId, {
          review: review,
          property: review.property,
          reason: rejectionReason
        });
      }
    } catch (notificationError) {
      console.error('Failed to send moderation notification:', notificationError.message);
    }

    return await getReviewById(reviewId);
  } catch (error) {
    console.error('Error moderating review:', error);
    throw error;
  }
};

/**
 * Add owner response to review
 */
export const addOwnerResponse = async (reviewId, response, ownerId) => {
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Check if user is the property owner
    if (review.ownerId !== ownerId) {
      throw new Error('Only the property owner can respond to this review');
    }

    // Check if review is approved
    if (review.status !== 'approved') {
      throw new Error('Can only respond to approved reviews');
    }

    await review.update({
      ownerResponse: response,
      ownerResponseAt: new Date()
    });

    // Send notification to reviewer
    try {
      await sendTemplateNotification('REVIEW_RESPONSE', review.reviewerId, {
        review: review,
        property: review.propertyId,
        ownerResponse: response
      });
    } catch (notificationError) {
      console.error('Failed to send response notification:', notificationError.message);
    }

    return await getReviewById(reviewId);
  } catch (error) {
    console.error('Error adding owner response:', error);
    throw error;
  }
};

/**
 * Mark review as helpful
 */
export const markReviewHelpful = async (reviewId, userId) => {
  try {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Increment helpful count
    await review.increment('helpfulCount');
    
    return { message: 'Review marked as helpful', helpfulCount: review.helpfulCount + 1 };
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    throw error;
  }
};

/**
 * Report review
 */
export const reportReview = async (reviewId, reportData, reporterId) => {
  try {
    const { reason, description } = reportData;
    
    const review = await Review.findByPk(reviewId);
    if (!review) {
      throw new Error('Review not found');
    }

    // Increment report count
    await review.increment('reportCount');

    // If report count reaches threshold, auto-hide review
    const updatedReview = await Review.findByPk(reviewId);
    if (updatedReview.reportCount >= 5 && updatedReview.status !== 'hidden') {
      await updatedReview.update({ status: 'hidden' });
    }

    // Send notification to moderators
    try {
      // Get all admin and moderator users
      const moderators = await User.findAll({
        where: { role: { [Op.in]: ['admin', 'moderator'] } }
      });

      for (const moderator of moderators) {
        await sendTemplateNotification('REVIEW_REPORTED', moderator.id, {
          review: review,
          reporter: reporterId,
          reason: reason,
          description: description
        });
      }
    } catch (notificationError) {
      console.error('Failed to send report notification:', notificationError.message);
    }

    return { message: 'Review reported successfully' };
  } catch (error) {
    console.error('Error reporting review:', error);
    throw error;
  }
};

/**
 * Get review statistics
 */
export const getReviewStats = async (options = {}) => {
  try {
    const { propertyId, ownerId, reviewType } = options;
    
    const where = {};
    if (propertyId) where.propertyId = propertyId;
    if (ownerId) where.ownerId = ownerId;
    if (reviewType) where.reviewType = reviewType;

    const [
      totalReviews,
      approvedReviews,
      pendingReviews,
      rejectedReviews,
      hiddenReviews,
      averageRating,
      ratingDistribution
    ] = await Promise.all([
      Review.count({ where }),
      Review.count({ where: { ...where, status: 'approved' } }),
      Review.count({ where: { ...where, status: 'pending' } }),
      Review.count({ where: { ...where, status: 'rejected' } }),
      Review.count({ where: { ...where, status: 'hidden' } }),
      Review.findOne({
        where: { ...where, status: 'approved' },
        attributes: [
          [Review.sequelize.fn('AVG', Review.sequelize.col('rating')), 'averageRating']
        ],
        raw: true
      }),
      Review.findAll({
        where: { ...where, status: 'approved' },
        attributes: [
          'rating',
          [Review.sequelize.fn('COUNT', Review.sequelize.col('rating')), 'count']
        ],
        group: ['rating'],
        raw: true
      })
    ]);

    return {
      totalReviews,
      approvedReviews,
      pendingReviews,
      rejectedReviews,
      hiddenReviews,
      averageRating: averageRating?.averageRating ? parseFloat(averageRating.averageRating).toFixed(2) : 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = parseInt(item.count);
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting review stats:', error);
    throw error;
  }
};

/**
 * Get property rating summary
 */
export const getPropertyRatingSummary = async (propertyId) => {
  try {
    const stats = await getReviewStats({ propertyId, reviewType: 'property' });
    
    const subRatingStats = await Promise.all([
      'cleanliness', 'communication', 'checkIn', 'accuracy', 'location', 'value'
    ].map(async (field) => {
      const result = await Review.findOne({
        where: { propertyId, status: 'approved' },
        attributes: [
          [Review.sequelize.fn('AVG', Review.sequelize.col(field)), 'average']
        ],
        raw: true
      });
      return {
        field,
        average: result?.average ? parseFloat(result.average).toFixed(2) : 0
      };
    }));

    return {
      ...stats,
      subRatings: subRatingStats.reduce((acc, item) => {
        acc[item.field] = item.average;
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting property rating summary:', error);
    throw error;
  }
};

/**
 * Get user's review history
 */
export const getUserReviewHistory = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    
    const where = { reviewerId: userId };
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title', 'address', 'city', 'state'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user review history:', error);
    throw error;
  }
};

/**
 * Get reviews pending moderation
 */
export const getPendingReviews = async (options = {}) => {
  try {
    const { page = 1, limit = 20, reviewType } = options;
    
    const where = { status: 'pending' };
    if (reviewType) where.reviewType = reviewType;

    const offset = (page - 1) * limit;

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'firstName', 'lastName', 'avatarUrl'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'address'] },
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error getting pending reviews:', error);
    throw error;
  }
};

/**
 * Bulk moderate reviews
 */
export const bulkModerateReviews = async (reviewIds, moderationData, moderatorId) => {
  try {
    const { status, rejectionReason } = moderationData;
    
    if (!['approved', 'rejected', 'hidden'].includes(status)) {
      throw new Error('Invalid moderation status');
    }

    const updateData = {
      status,
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const [affectedCount] = await Review.update(updateData, {
      where: { id: { [Op.in]: reviewIds } }
    });

    return { message: `${affectedCount} reviews moderated successfully` };
  } catch (error) {
    console.error('Error bulk moderating reviews:', error);
    throw error;
  }
};
