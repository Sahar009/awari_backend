import { KycDocument, User } from '../schema/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { deleteFromCloudinary, extractPublicId } from '../config/cloudinary.js';

/**
 * KYC Service - Business logic for KYC document management
 */
class KycService {
  /**
   * Create a new KYC document
   */
  async createKycDocument(userId, documentData, uploadResults = null) {
    try {
      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a document of this type
      const existingDocument = await KycDocument.findOne({
        where: {
          userId,
          documentType: documentData.documentType,
          status: {
            [Op.in]: ['pending', 'approved']
          }
        }
      });

      if (existingDocument) {
        throw new Error(`You already have a ${documentData.documentType} document that is pending or approved`);
      }

      // Prepare document data
      const kycData = {
        userId,
        documentType: documentData.documentType,
        documentNumber: documentData.documentNumber,
        expiresAt: documentData.expiresAt
      };

      // Handle file uploads from Cloudinary
      if (uploadResults) {
        if (uploadResults.document) {
          kycData.documentUrl = uploadResults.document.secure_url;
        }
        if (uploadResults.thumbnail) {
          kycData.documentThumbnail = uploadResults.thumbnail.secure_url;
        }
      } else {
        // Handle direct URL submission
        kycData.documentUrl = documentData.documentUrl;
        kycData.documentThumbnail = documentData.documentThumbnail;
      }

      // Create the KYC document
      const kycDocument = await KycDocument.create(kycData);

      // Fetch the created document with user details
      const createdDocument = await KycDocument.findByPk(kycDocument.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return {
        success: true,
        message: 'KYC document submitted successfully',
        data: createdDocument
      };
    } catch (error) {
      // Clean up uploaded files if document creation fails
      if (uploadResults) {
        for (const [fieldName, fileData] of Object.entries(uploadResults)) {
          if (fileData.public_id) {
            await deleteFromCloudinary(fileData.public_id);
          }
        }
      }
      throw new Error(error.message || 'Failed to create KYC document');
    }
  }

  /**
   * Get all KYC documents for a user
   */
  async getUserKycDocuments(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status, documentType } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = { userId };
      if (status) whereClause.status = status;
      if (documentType) whereClause.documentType = documentType;

      const { count, rows } = await KycDocument.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          documents: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch KYC documents');
    }
  }

  /**
   * Get a specific KYC document by ID
   */
  async getKycDocumentById(documentId, userId = null) {
    try {
      const whereClause = { id: documentId };
      
      if (userId) {
        whereClause.userId = userId;
      }

      const kycDocument = await KycDocument.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      if (!kycDocument) {
        throw new Error('KYC document not found');
      }

      return {
        success: true,
        data: kycDocument
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch KYC document');
    }
  }

  /**
   * Update a KYC document (user can only update pending documents)
   */
  async updateKycDocument(documentId, userId, updateData) {
    try {
      const kycDocument = await KycDocument.findOne({
        where: {
          id: documentId,
          userId
        }
      });

      if (!kycDocument) {
        throw new Error('KYC document not found');
      }

      if (kycDocument.status !== 'pending') {
        throw new Error('Only pending documents can be updated');
      }

      await kycDocument.update(updateData);

      const updatedDocument = await KycDocument.findByPk(documentId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return {
        success: true,
        message: 'KYC document updated successfully',
        data: updatedDocument
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to update KYC document');
    }
  }

  /**
   * Delete a KYC document (user can only delete pending documents)
   */
  async deleteKycDocument(documentId, userId) {
    try {
      const kycDocument = await KycDocument.findOne({
        where: {
          id: documentId,
          userId
        }
      });

      if (!kycDocument) {
        throw new Error('KYC document not found');
      }

      if (kycDocument.status !== 'pending') {
        throw new Error('Only pending documents can be deleted');
      }

      // Clean up Cloudinary files before deleting the record
      if (kycDocument.documentUrl) {
        const documentPublicId = extractPublicId(kycDocument.documentUrl);
        if (documentPublicId) {
          await deleteFromCloudinary(documentPublicId);
        }
      }

      if (kycDocument.documentThumbnail) {
        const thumbnailPublicId = extractPublicId(kycDocument.documentThumbnail);
        if (thumbnailPublicId) {
          await deleteFromCloudinary(thumbnailPublicId);
        }
      }

      await kycDocument.destroy();

      return {
        success: true,
        message: 'KYC document deleted successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete KYC document');
    }
  }

  /**
   * Admin: Get all KYC documents with filtering and pagination
   */
  async getAllKycDocuments(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        documentType,
        userId,
        verifiedBy,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (status) whereClause.status = status;
      if (documentType) whereClause.documentType = documentType;
      if (userId) whereClause.userId = userId;
      if (verifiedBy) whereClause.verifiedBy = verifiedBy;

      const { count, rows } = await KycDocument.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          documents: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch KYC documents');
    }
  }

  /**
   * Admin: Verify a KYC document
   */
  async verifyKycDocument(documentId, verifierId, verificationData) {
    try {
      const kycDocument = await KycDocument.findByPk(documentId);

      if (!kycDocument) {
        throw new Error('KYC document not found');
      }

      if (kycDocument.status !== 'pending') {
        throw new Error('Only pending documents can be verified');
      }

      // Update the document with verification details
      await kycDocument.update({
        status: verificationData.status,
        verificationNotes: verificationData.verificationNotes,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        rejectionReason: verificationData.status === 'rejected' ? verificationData.rejectionReason : null
      });

      // Fetch updated document with relations
      const updatedDocument = await KycDocument.findByPk(documentId, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'verifier',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return {
        success: true,
        message: `KYC document ${verificationData.status} successfully`,
        data: updatedDocument
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to verify KYC document');
    }
  }

  /**
   * Get KYC statistics for admin dashboard
   */
  async getKycStatistics() {
    try {
      const stats = await KycDocument.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const documentTypeStats = await KycDocument.findAll({
        attributes: [
          'documentType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['documentType'],
        raw: true
      });

      return {
        success: true,
        data: {
          statusStats: stats,
          documentTypeStats: documentTypeStats
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch KYC statistics');
    }
  }
}

export default new KycService();
