const { Inspection, Property, User } = require('../models');
const { Op } = require('sequelize');
const { respondToBookingRequest } = require('../services/landlordDashboardService');
const { createNotification } = require('../services/notificationService');
const { sendEmail } = require('../modules/notifications/email');

/**
 * Get all inspections for a landlord
 */
exports.getLandlordInspections = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    console.log('🔍 Fetching landlord inspections:', {
      landlordId,
      query: req.query
    });

    // Build where clause
    const whereClause = {
      include: [
        {
          model: Property,
          as: 'property',
          where: {
            ownerId: landlordId
          },
          attributes: ['id', 'title', 'address', 'city', 'primaryImage']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'DESC']]
    };

    // Add status filter if provided
    if (status && status !== 'all') {
      whereClause.where = { status };
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    whereClause.offset = offset;
    whereClause.limit = parseInt(limit);

    const { count, rows: inspections } = await Inspection.findAndCountAll(whereClause);

    console.log('✅ Landlord inspections fetched:', {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      inspectionsFound: inspections.length
    });

    res.json({
      success: true,
      message: 'Inspections retrieved successfully',
      data: {
        inspections,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching landlord inspections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspections',
      error: error.message
    });
  }
};

/**
 * Respond to an inspection request (approve/reject)
 */
exports.respondToInspection = async (req, res) => {
  try {
    const landlordId = req.user.id;
    const { inspectionId } = req.params;
    const { action, notes } = req.body;

    console.log('🔍 Responding to inspection:', {
      landlordId,
      inspectionId,
      action,
      notes
    });

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject'
      });
    }

    // Validate notes for rejection
    if (action === 'reject' && (!notes || notes.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Notes are required when rejecting an inspection'
      });
    }

    // Find the inspection and verify ownership
    const inspection = await Inspection.findOne({
      where: { id: inspectionId },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'ownerId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // Verify that the landlord owns this property
    if (inspection.property.ownerId !== landlordId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this inspection'
      });
    }

    // Check if inspection is still pending
    if (inspection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} inspection with status: ${inspection.status}`
      });
    }

    // Update inspection status and notes
    const newStatus = action === 'approve' ? 'confirmed' : 'cancelled';
    
    await inspection.update({
      status: newStatus,
      ownerNotes: notes ? notes.trim() : null,
      updatedAt: new Date()
    });

    console.log('✅ Inspection updated successfully:', {
      inspectionId,
      oldStatus: 'pending',
      newStatus,
      action
    });

    // Send notification to the buyer
    try {
      const notificationTitle = action === 'approve' 
        ? 'Inspection Request Approved' 
        : 'Inspection Request Update';
      
      const notificationMessage = action === 'approve'
        ? `Your inspection request for ${inspection.property.title} has been approved.`
        : `Your inspection request for ${inspection.property.title} has been reviewed.`;

      // Create in-app notification
      await createNotification({
        userId: inspection.user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: action === 'approve' ? 'success' : 'warning',
        category: 'inspection',
        priority: 'high',
        channels: ['in_app', 'push', 'email'],
        actionUrl: `/product-details?id=${inspection.property.id}`,
        actionText: 'View Property',
        propertyId: inspection.property.id,
        data: {
          inspectionId: inspection.id,
          action: action,
          propertyTitle: inspection.property.title,
          inspectionDate: inspection.inspectionDate,
          inspectionTime: inspection.inspectionTime
        }
      });

      // Send email notification
      const emailTemplate = action === 'approve' ? 'inspection-approved' : 'inspection-rejected';
      const emailSubject = action === 'approve' 
        ? '✅ Inspection Request Approved - Awari Properties' 
        : '📋 Inspection Request Update - Awari Properties';

      await sendEmail(
        inspection.user.email,
        emailSubject,
        notificationMessage,
        emailTemplate,
        {
          buyerName: `${inspection.user.firstName} ${inspection.user.lastName}`,
          propertyTitle: inspection.property.title,
          propertyAddress: inspection.property.address,
          propertyCity: inspection.property.city,
          inspectionDate: new Date(inspection.inspectionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          inspectionTime: inspection.inspectionTime || 'Not specified',
          ownerName: `${req.user.firstName} ${req.user.lastName}`,
          ownerNotes: notes || null,
          propertyUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/product-details?id=${inspection.property.id}`,
          browseUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/browse-listing`
        }
      );

      console.log('✅ Notification and email sent successfully:', {
        userId: inspection.user.id,
        userEmail: inspection.user.email,
        action,
        propertyTitle: inspection.property.title
      });

    } catch (notificationError) {
      console.error('❌ Error sending notification/email:', notificationError);
      // Don't fail the request if notification fails, but log it
    }

    res.json({
      success: true,
      message: `Inspection ${action}d successfully`,
      data: {
        inspectionId: inspection.id,
        status: newStatus,
        action: action,
        notes: notes ? notes.trim() : null
      }
    });

  } catch (error) {
    console.error('❌ Error responding to inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to inspection',
      error: error.message
    });
  }
};

/**
 * Get inspection statistics for a landlord
 */
exports.getInspectionStats = async (req, res) => {
  try {
    const landlordId = req.user.id;

    console.log('🔍 Fetching inspection stats for landlord:', landlordId);

    const stats = await Inspection.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      include: [
        {
          model: Property,
          as: 'property',
          where: {
            ownerId: landlordId
          },
          attributes: []
        }
      ],
      group: ['status'],
      raw: true
    });

    const result = {
      total: 0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.count);
      result[stat.status] = parseInt(stat.count);
    });

    console.log('✅ Inspection stats fetched:', result);

    res.json({
      success: true,
      message: 'Inspection statistics retrieved successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching inspection stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspection statistics',
      error: error.message
    });
  }
};
