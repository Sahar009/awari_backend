import express from 'express';
import kycController from '../controllers/kycController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  uploadKycDocuments,
  uploadSingleDocument,
  processUploadedFiles,
  handleUploadError
} from '../middlewares/uploadMiddleware.js';
import {
  createKycDocumentValidation,
  createKycDocumentUrlValidation,
  updateKycDocumentValidation,
  verifyKycDocumentValidation,
  documentIdValidation,
  getUserKycDocumentsValidation,
  getAdminKycDocumentsValidation
} from '../validations/kycValidation.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     KycDocument:
 *       type: object
 *       required:
 *         - documentType
 *         - documentUrl
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the KYC document
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user who submitted the document
 *         documentType:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *           description: Type of document submitted
 *         documentNumber:
 *           type: string
 *           maxLength: 100
 *           description: Document number or reference
 *         documentUrl:
 *           type: string
 *           format: url
 *           description: URL to the document file
 *         documentThumbnail:
 *           type: string
 *           format: url
 *           description: URL to the document thumbnail
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, expired]
 *           default: pending
 *           description: Current status of the document
 *         verificationNotes:
 *           type: string
 *           description: Notes from the verifier
 *         verifiedBy:
 *           type: string
 *           format: uuid
 *           description: ID of the admin who verified the document
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *           description: When the document was verified
 *         expiresAt:
 *           type: string
 *           format: date
 *           description: Document expiration date
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection if applicable
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateKycDocumentRequest:
 *       type: object
 *       required:
 *         - documentType
 *         - documentUrl
 *       properties:
 *         documentType:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *         documentNumber:
 *           type: string
 *           maxLength: 100
 *         documentUrl:
 *           type: string
 *           format: url
 *         documentThumbnail:
 *           type: string
 *           format: url
 *         expiresAt:
 *           type: string
 *           format: date
 *     
 *     UpdateKycDocumentRequest:
 *       type: object
 *       properties:
 *         documentType:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *         documentNumber:
 *           type: string
 *           maxLength: 100
 *         documentUrl:
 *           type: string
 *           format: url
 *         documentThumbnail:
 *           type: string
 *           format: url
 *         expiresAt:
 *           type: string
 *           format: date
 *     
 *     VerifyKycDocumentRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected]
 *         verificationNotes:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *         rejectionReason:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *     
 *     KycDocumentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/KycDocument'
 *     
 *     KycDocumentsListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             documents:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/KycDocument'
 *             pagination:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *     
 *     KycStatisticsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             statusStats:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   count:
 *                     type: integer
 *             documentTypeStats:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   documentType:
 *                     type: string
 *                   count:
 *                     type: integer
 */

/**
 * @swagger
 * /api/kyc/upload:
 *   post:
 *     summary: Submit a new KYC document with file upload
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - document
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Document file (PDF, JPG, PNG, etc.)
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Optional thumbnail image
 *               documentNumber:
 *                 type: string
 *                 maxLength: 100
 *               expiresAt:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: KYC document submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       400:
 *         description: Validation error or business logic error
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', 
  authenticateToken, 
  uploadKycDocuments, 
  handleUploadError,
  processUploadedFiles, 
  createKycDocumentValidation, 
  kycController.createKycDocument
);

/**
 * @swagger
 * /api/kyc:
 *   post:
 *     summary: Submit a new KYC document with URL
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateKycDocumentRequest'
 *     responses:
 *       201:
 *         description: KYC document submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       400:
 *         description: Validation error or business logic error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, createKycDocumentUrlValidation, kycController.createKycDocument);

/**
 * @swagger
 * /api/kyc:
 *   get:
 *     summary: Get user's KYC documents
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of documents per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, expired]
 *         description: Filter by document status
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *         description: Filter by document type
 *     responses:
 *       200:
 *         description: List of user's KYC documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentsListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, getUserKycDocumentsValidation, kycController.getUserKycDocuments);

/**
 * @swagger
 * /api/kyc/{documentId}:
 *   get:
 *     summary: Get a specific KYC document
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: KYC document ID
 *     responses:
 *       200:
 *         description: KYC document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       404:
 *         description: KYC document not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:documentId', authenticateToken, documentIdValidation, kycController.getKycDocumentById);

/**
 * @swagger
 * /api/kyc/{documentId}:
 *   put:
 *     summary: Update a KYC document
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: KYC document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateKycDocumentRequest'
 *     responses:
 *       200:
 *         description: KYC document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       400:
 *         description: Validation error or business logic error
 *       404:
 *         description: KYC document not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:documentId', authenticateToken, documentIdValidation, updateKycDocumentValidation, kycController.updateKycDocument);

/**
 * @swagger
 * /api/kyc/{documentId}:
 *   delete:
 *     summary: Delete a KYC document
 *     tags: [KYC Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: KYC document ID
 *     responses:
 *       200:
 *         description: KYC document deleted successfully
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
 *         description: Business logic error (e.g., cannot delete non-pending document)
 *       404:
 *         description: KYC document not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:documentId', authenticateToken, documentIdValidation, kycController.deleteKycDocument);

// Admin routes
/**
 * @swagger
 * /api/kyc/admin/all:
 *   get:
 *     summary: Get all KYC documents (Admin only)
 *     tags: [KYC Documents - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of documents per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, expired]
 *         description: Filter by document status
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, employment_letter, tax_document]
 *         description: Filter by document type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: verifiedBy
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by verifier ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, verifiedAt, expiresAt, status, documentType]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all KYC documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentsListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
router.get('/admin/all', authenticateToken, requireRole(['admin']), getAdminKycDocumentsValidation, kycController.getAllKycDocuments);

/**
 * @swagger
 * /api/kyc/admin/{documentId}:
 *   get:
 *     summary: Get a specific KYC document (Admin only)
 *     tags: [KYC Documents - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: KYC document ID
 *     responses:
 *       200:
 *         description: KYC document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       404:
 *         description: KYC document not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
router.get('/admin/:documentId', authenticateToken, requireRole(['admin']), documentIdValidation, kycController.getKycDocumentByIdAdmin);

/**
 * @swagger
 * /api/kyc/admin/{documentId}/verify:
 *   post:
 *     summary: Verify a KYC document (Admin only)
 *     tags: [KYC Documents - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: KYC document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyKycDocumentRequest'
 *     responses:
 *       200:
 *         description: KYC document verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycDocumentResponse'
 *       400:
 *         description: Validation error or business logic error
 *       404:
 *         description: KYC document not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
router.post('/admin/:documentId/verify', authenticateToken, requireRole(['admin']), documentIdValidation, verifyKycDocumentValidation, kycController.verifyKycDocument);

/**
 * @swagger
 * /api/kyc/admin/statistics:
 *   get:
 *     summary: Get KYC statistics (Admin only)
 *     tags: [KYC Documents - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/KycStatisticsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
router.get('/admin/statistics', authenticateToken, requireRole(['admin']), kycController.getKycStatistics);

export default router;
