import kycService from '../services/kycService.js';
import { validationResult } from 'express-validator';

/**
 * KYC Controller - Handles HTTP requests for KYC document management
 */
class KycController {
  /**
   * Create a new KYC document
   */
  async createKycDocument(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const documentData = req.body;
      const uploadResults = req.uploadResults || null;

      const result = await kycService.createKycDocument(userId, documentData, uploadResults);

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get all KYC documents for the authenticated user
   */
  async getUserKycDocuments(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        documentType: req.query.documentType
      };

      const result = await kycService.getUserKycDocuments(userId, options);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get a specific KYC document by ID
   */
  async getKycDocumentById(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const result = await kycService.getKycDocumentById(documentId, userId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'KYC document not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update a KYC document
   */
  async updateKycDocument(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { documentId } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const result = await kycService.updateKycDocument(documentId, userId, updateData);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'KYC document not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete a KYC document
   */
  async deleteKycDocument(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const result = await kycService.deleteKycDocument(documentId, userId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'KYC document not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get all KYC documents with filtering
   */
  async getAllKycDocuments(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        documentType: req.query.documentType,
        userId: req.query.userId,
        verifiedBy: req.query.verifiedBy,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await kycService.getAllKycDocuments(options);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Verify a KYC document
   */
  async verifyKycDocument(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { documentId } = req.params;
      const verifierId = req.user.id;
      const verificationData = req.body;

      const result = await kycService.verifyKycDocument(documentId, verifierId, verificationData);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'KYC document not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get KYC statistics
   */
  async getKycStatistics(req, res) {
    try {
      const result = await kycService.getKycStatistics();

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get a specific KYC document (without user restriction)
   */
  async getKycDocumentByIdAdmin(req, res) {
    try {
      const { documentId } = req.params;

      const result = await kycService.getKycDocumentById(documentId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'KYC document not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new KycController();
