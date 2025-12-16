import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  registerDeviceTokenValidation,
  updatePreferencesValidation
} from '../validations/authValidation.js';
import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Configure multer for avatar uploads
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User unique identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User last name
 *         phone:
 *           type: string
 *           description: User phone number
 *         googleId:
 *           type: string
 *           description: Google OAuth ID (if linked)
 *         avatarUrl:
 *           type: string
 *           description: User avatar URL
 *         role:
 *           type: string
 *           enum: [renter, buyer, landlord, agent, hotel_provider, admin]
 *           default: renter
 *           description: User role
 *         status:
 *           type: string
 *           enum: [pending, active, suspended, banned, deleted]
 *           default: pending
 *           description: User account status
 *         emailVerified:
 *           type: boolean
 *           default: false
 *           description: Email verification status
 *         kycVerified:
 *           type: boolean
 *           default: false
 *           description: KYC verification status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User password (min 8 chars, must include uppercase, lowercase, number, special char)
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User last name
 *         phone:
 *           type: string
 *           description: User phone number
 *         role:
 *           type: string
 *           enum: [renter, buyer, landlord, agent, hotel_provider]
 *           default: renter
 *           description: User role
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User date of birth (must be 18+)
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: User gender
 *         city:
 *           type: string
 *           description: User city
 *         state:
 *           type: string
 *           description: User state
 *         country:
 *           type: string
 *           description: User country
 *         postalCode:
 *           type: string
 *           description: User postal code
 *         timezone:
 *           type: string
 *           description: User timezone
 *         language:
 *           type: string
 *           default: en
 *           description: User preferred language
 *         bio:
 *           type: string
 *           maxLength: 1000
 *           description: User bio
 *         socialLinks:
 *           type: object
 *           description: User social media links
 *         preferences:
 *           type: object
 *           description: User preferences
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         password:
 *           type: string
 *           description: User password
 *     
 *     GoogleSignInRequest:
 *       type: object
 *       required:
 *         - idToken
 *       properties:
 *         idToken:
 *           type: string
 *           description: Firebase ID token from client-side authentication
 *     
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *     
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - resetToken
 *         - newPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         resetToken:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           description: 6-digit reset token
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (min 8 chars, must include uppercase, lowercase, number, special char)
 *     
 *     AccountDeletionRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           description: User password for confirmation
 *     
 *     ConfirmDeletionRequest:
 *       type: object
 *       required:
 *         - email
 *         - deletionToken
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         deletionToken:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           description: 6-digit deletion token
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Request success status
 *         message:
 *           type: string
 *           description: Response message
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               description: JWT authentication token
 *     
 *     ProfileUpdateRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: User last name
 *         phone:
 *           type: string
 *           description: User phone number
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User date of birth (must be 18+)
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: User gender
 *         address:
 *           type: string
 *           maxLength: 500
 *           description: User address
 *         city:
 *           type: string
 *           description: User city
 *         state:
 *           type: string
 *           description: User state
 *         country:
 *           type: string
 *           description: User country
 *         postalCode:
 *           type: string
 *           description: User postal code
 *         timezone:
 *           type: string
 *           description: User timezone
 *         language:
 *           type: string
 *           description: User preferred language
 *         bio:
 *           type: string
 *           maxLength: 1000
 *           description: User bio
 *         socialLinks:
 *           type: object
 *           description: User social media links
 *         preferences:
 *           type: object
 *           description: User preferences
 *     
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (min 8 chars, must include uppercase, lowercase, number, special char)
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error message
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Field name with error
 *               message:
 *                 type: string
 *                 description: Error message
 *               value:
 *                 type: string
 *                 description: Invalid value
 *   
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token for authentication
 * */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and profile management
 * */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "SecurePass123!"
 *             firstName: "John"
 *             lastName: "Doe"
 *             phone: "+2348012345678"
 *             role: "renter"
 *             dateOfBirth: "1990-01-01"
 *             gender: "male"
 *             city: "Lagos"
 *             state: "Lagos"
 *             country: "Nigeria"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: "User registered successfully"
 *               data:
 *                 user:
 *                   id: "uuid-here"
 *                   email: "john.doe@example.com"
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   role: "renter"
 *                   status: "pending"
 *                   emailVerified: false
 *                   kycVerified: false
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *                   updatedAt: "2024-01-01T00:00:00.000Z"
 *                 token: "jwt-token-here"
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 * */
router.post('/register', registerValidation, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 *       500:
 *         description: Internal server error
 * */
router.post('/login', loginValidation, authController.login);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google Sign-In authentication using Firebase
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleSignInRequest'
 *           example:
 *             idToken: "firebase_id_token_here"
 *     responses:
 *       200:
 *         description: Google Sign-In successful
 *       400:
 *         description: Firebase ID token is required
 *       401:
 *         description: Invalid Firebase token
 *       403:
 *         description: Account not active
 *       500:
 *         description: Internal server error
 * */
router.post('/google', authController.googleSignIn);

/**
 * @swagger
 * /api/auth/link-google:
 *   post:
 *     summary: Link Google account to existing user using Firebase
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleSignInRequest'
 *     responses:
 *       200:
 *         description: Google account linked successfully
 *       400:
 *         description: Firebase ID token is required or invalid
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Google account already linked to another user
 *       500:
 *         description: Internal server error
 * */
router.post('/link-google', authenticateToken, authController.linkGoogleAccount);

/**
 * @swagger
 * /api/auth/unlink-google:
 *   post:
 *     summary: Unlink Google account from user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Google account unlinked successfully
 *       400:
 *         description: No Google account linked or cannot unlink
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.post('/unlink-google', authenticateToken, authController.unlinkGoogleAccount);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - verificationCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *               verificationCode:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 4
 *                 description: 4-digit verification code
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid verification code
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * */
router.post('/verify-email', authController.verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * */
router.post('/resend-verification', authController.resendVerificationEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *           example:
 *             email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 *       400:
 *         description: Email is required
 *       500:
 *         description: Internal server error
 * */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             resetToken: "123456"
 *             newPassword: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid reset token or expired
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/request-deletion:
 *   post:
 *     summary: Request account deletion
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountDeletionRequest'
 *           example:
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Deletion request sent successfully
 *       400:
 *         description: Password is required or incorrect
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.post('/request-deletion', authenticateToken, authController.requestAccountDeletion);

/**
 * @swagger
 * /api/auth/confirm-deletion:
 *   post:
 *     summary: Confirm account deletion
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmDeletionRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             deletionToken: "123456"
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid deletion token or expired
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * */
router.post('/confirm-deletion', authController.confirmAccountDeletion);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileUpdateRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
// Middleware to handle avatar upload and process it
const handleAvatarUpload = async (req, res, next) => {
  try {
    // If there's an avatar file, upload it to Cloudinary
    if (req.file) {
      console.log('📤 [AUTH ROUTE] Processing avatar upload');
      const uploadOptions = {
        folder: 'awari-profiles/avatars',
        resource_type: 'image',
        quality: 80,
        fetch_format: 'auto'
      };

      const result = await uploadToCloudinary(req.file.buffer, {
        ...uploadOptions,
        mimeType: req.file.mimetype
      });
      
      if (result.success) {
        // Add avatarUrl to req.body so it can be processed by the controller
        req.body.avatarUrl = result.data.secure_url;
        console.log('✅ [AUTH ROUTE] Avatar uploaded successfully:', result.data.secure_url);
      } else {
        console.error('❌ [AUTH ROUTE] Avatar upload failed:', result.error);
        return res.status(400).json({
          success: false,
          message: 'Avatar upload failed',
          error: result.error
        });
      }
    }
    next();
  } catch (error) {
    console.error('❌ [AUTH ROUTE] Error processing avatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing avatar',
      error: error.message
    });
  }
};

// Error handler for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Avatar file too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  if (error.message && error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

router.put('/profile', 
  authenticateToken, 
  avatarUpload.single('avatar'),
  handleMulterError,
  handleAvatarUpload,
  updateProfileValidation, 
  authController.updateProfile
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.post('/change-password', authenticateToken, changePasswordValidation, authController.changePassword);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh user authentication token
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account not active
 *       500:
 *         description: Internal server error
 * */
router.post('/refresh-token', authenticateToken, authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /api/auth/register-device-token:
 *   post:
 *     summary: Register or update device push token for push notifications
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pushToken
 *             properties:
 *               pushToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging device token
 *           example:
 *             pushToken: "fcm-token-here"
 *     responses:
 *       200:
 *         description: Device token registered successfully
 *       400:
 *         description: Validation failed or invalid token
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.post('/register-device-token', authenticateToken, registerDeviceTokenValidation, authController.registerDeviceToken);

/**
 * @swagger
 * /api/auth/settings/preferences:
 *   get:
 *     summary: Get user preferences (notifications and privacy)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: boolean
 *                         push:
 *                           type: boolean
 *                         sms:
 *                           type: boolean
 *                     privacy:
 *                       type: object
 *                       properties:
 *                         profileVisible:
 *                           type: boolean
 *                         showEmail:
 *                           type: boolean
 *                         showPhone:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.get('/settings/preferences', authenticateToken, authController.getPreferences);

/**
 * @swagger
 * /api/auth/settings/preferences:
 *   put:
 *     summary: Update user preferences (notifications and privacy)
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *               privacy:
 *                 type: object
 *                 properties:
 *                   profileVisible:
 *                     type: boolean
 *                   showEmail:
 *                     type: boolean
 *                   showPhone:
 *                     type: boolean
 *           example:
 *             notifications:
 *               email: true
 *               push: true
 *               sms: false
 *             privacy:
 *               profileVisible: true
 *               showEmail: false
 *               showPhone: false
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * */
router.put('/settings/preferences', authenticateToken, updatePreferencesValidation, authController.updatePreferences);

export default router;
