import { User } from '../schema/index.js';
import sequelize from '../database/db.js';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken as generateJWTToken,
  generateVerificationCode,
  messageHandler 
} from '../utils/index.js';
import { sendEmail } from '../modules/notifications/email.js';
import { sendTemplateNotification } from './notificationService.js';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user object (without password)
   */
  async register(userData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email: userData.email },
        transaction
      });

      if (existingUser) {
        await transaction.rollback();
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Generate verification code
      const verificationCode = generateVerificationCode(4);

      // Create user within transaction
      const user = await User.create({
        ...userData,
        passwordHash: hashedPassword,
        emailVerificationCode: verificationCode,
        emailVerified: false
      }, { transaction });

      // Generate token before committing
      let token;
      try {
        token = this.generateToken(user);
      } catch (tokenError) {
        await transaction.rollback();
        console.error('Token generation error:', tokenError);
        throw new Error('Failed to generate authentication token');
      }

      // Prepare user data for response
      let userWithoutPassword;
      try {
        const userJson = user.toJSON();
        const { passwordHash: _, emailVerificationCode: __, ...rest } = userJson;
        userWithoutPassword = rest;
      } catch (jsonError) {
        await transaction.rollback();
        console.error('User data serialization error:', jsonError);
        throw new Error('Failed to prepare user data');
      }

      // Commit transaction - user is now saved
      await transaction.commit();

      // Send email verification (non-blocking - don't fail registration if email fails)
      try {
        await this.sendVerificationEmail(user.email, verificationCode, user.firstName);
      } catch (emailError) {
        console.warn('⚠️ Email verification failed, but user was created:', emailError.message);
        // Don't throw - user is already created
      }

      // Send welcome notification (non-blocking)
      try {
        await sendTemplateNotification('WELCOME', user);
      } catch (notificationError) {
        console.warn('⚠️ Welcome notification failed, but user was created:', notificationError.message);
        // Don't throw - user is already created
      }

      return {
        user: userWithoutPassword,
        token,
        message: 'Registration successful. Please check your email for verification code.'
      };
    } catch (error) {
      // Rollback transaction if it hasn't been committed
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      
      // Re-throw with better error message
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('User with this email already exists');
      }
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(e => e.message).join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      }
      
      if (error.name === 'SequelizeDatabaseError') {
        console.error('Database error during registration:', error);
        throw new Error('Database error occurred. Please try again.');
      }
      
      // Re-throw original error if it's already a known error
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User object and JWT token
   */
  async login(email, password) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (user.status !== 'active') {
        throw new Error('Account is not active. Please contact support.');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      await user.update({
        lastLogin: new Date(),
        loginCount: user.loginCount + 1
      });

      const token = this.generateToken(user);

      const { passwordHash, emailVerificationCode, ...userWithoutPassword } = user.toJSON();

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Google Sign-In authentication using Firebase
   * @param {string} idToken - Firebase ID token
   * @returns {Object} User object and JWT token
   */
  async googleSignIn(idToken) {
    try {
      const firebaseUser = await this.verifyFirebaseToken(idToken);
      
      if (!firebaseUser) {
        throw new Error('Invalid Firebase token');
      }

      let user = await User.findOne({
        where: { email: firebaseUser.email }
      });

      if (user) {
        await user.update({
          lastLogin: new Date(),
          loginCount: user.loginCount + 1,
          googleId: firebaseUser.uid,
          avatarUrl: firebaseUser.photoURL || user.avatarUrl,
          emailVerified: firebaseUser.emailVerified || user.emailVerified
        });

        if (user.status !== 'active') {
          throw new Error('Account is not active. Please contact support.');
        }
      } else {
        user = await User.create({
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'User',
          avatarUrl: firebaseUser.photoURL,
          googleId: firebaseUser.uid,
          emailVerified: firebaseUser.emailVerified || true,
          status: 'active',
          passwordHash: null, 
          role: 'renter', 
          profileCompleted: false
        });
      }

      const token = this.generateToken(user);

      const { passwordHash, emailVerificationCode, ...userWithoutPassword } = user.toJSON();

      return {
        user: userWithoutPassword,
        token,
        message: user.passwordHash ? 'Login successful' : 'Account created successfully with Google'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} idToken - Firebase ID token
   * @returns {Object|null} Firebase user data or null if invalid
   */
  async verifyFirebaseToken(idToken) {
    try {
      const { getAuth } = await import('firebase-admin/auth');
      
      const auth = getAuth();
      
      const decodedToken = await auth.verifyIdToken(idToken);
      
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        providerId: decodedToken.provider_id,
        signInProvider: decodedToken.sign_in_provider,
        firebase: decodedToken.firebase
      };
    } catch (error) {
      console.error('Firebase token verification error:', error);
      return null;
    }
  }

  /**
   * Link Google account to existing user using Firebase
   * @param {string} userId - User ID
   * @param {string} idToken - Firebase ID token
   * @returns {Object} Success message
   */
  async linkGoogleAccount(userId, idToken) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify Firebase token
      const firebaseUser = await this.verifyFirebaseToken(idToken);
      
      if (!firebaseUser) {
        throw new Error('Invalid Firebase token');
      }

      const existingFirebaseUser = await User.findOne({
        where: { googleId: firebaseUser.uid }
      });

      if (existingFirebaseUser && existingFirebaseUser.id !== userId) {
        throw new Error('This Google account is already linked to another user');
      }

      await user.update({
        googleId: firebaseUser.uid,
        avatarUrl: firebaseUser.photoURL || user.avatarUrl,
        emailVerified: firebaseUser.emailVerified || user.emailVerified
      });

      return {
        success: true,
        message: 'Google account linked successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unlink Google account from user
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async unlinkGoogleAccount(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.googleId) {
        throw new Error('No Google account linked to this user');
      }

      if (!user.passwordHash) {
        throw new Error('Cannot unlink Google account. Please set a password first.');
      }

      await user.update({
        googleId: null
      });

      return {
        success: true,
        message: 'Google account unlinked successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify email with verification code
   * @param {string} email - User email
   * @param {string} verificationCode - 4-digit verification code
   * @returns {Object} Success message
   */
  async verifyEmail(email, verificationCode) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerified) {
        throw new Error('Email already verified');
      }

      if (user.emailVerificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      await user.update({
        emailVerified: true,
        emailVerificationCode: null,
        status: 'active'
      });

      return {
        success: true,
        message: 'Email verified successfully. Your account is now active.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend verification email
   * @param {string} email - User email
   * @returns {Object} Success message
   */
  async resendVerificationEmail(email) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerified) {
        throw new Error('Email already verified');
      }

      const verificationCode = generateVerificationCode(4);

      await user.update({
        emailVerificationCode: verificationCode
      });

      await this.sendVerificationEmail(user.email, verificationCode, user.firstName);

      return {
        success: true,
        message: 'Verification email sent successfully.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot password - send reset link
   * @param {string} email - User email
   * @returns {Object} Success message
   */
  async forgotPassword(email) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      if (!user.passwordHash) {
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const resetToken = generateVerificationCode(6);
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry
      });

      // Send reset email
      await this.sendPasswordResetEmail(user.email, resetToken, user.firstName);

      return {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} email - User email
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async resetPassword(email, resetToken, newPassword) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.passwordResetToken || !user.passwordResetExpires) {
        throw new Error('No password reset request found');
      }

      if (user.passwordResetToken !== resetToken) {
        throw new Error('Invalid reset token');
      }

      if (new Date() > user.passwordResetExpires) {
        throw new Error('Reset token has expired');
      }

      const hashedPassword = await hashPassword(newPassword);

      await user.update({
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      await this.sendPasswordChangedEmail(user.email, user.firstName);

      return {
        success: true,
        message: 'Password has been reset successfully.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password (authenticated user)
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.passwordHash) {
        throw new Error('Password change not available for Google-only accounts');
      }

      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const hashedNewPassword = await hashPassword(newPassword);

      await user.update({ passwordHash: hashedNewPassword });

      await this.sendPasswordChangedEmail(user.email, user.firstName);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request account deletion
   * @param {string} userId - User ID
   * @param {string} password - User password for confirmation
   * @returns {Object} Success message
   */
  async requestAccountDeletion(userId, password) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.passwordHash) {
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          throw new Error('Password is incorrect');
        }
      }

      const deletionToken = generateVerificationCode(6);
      const deletionTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await user.update({
        accountDeletionToken: deletionToken,
        accountDeletionExpires: deletionTokenExpiry
      });

      await this.sendAccountDeletionEmail(user.email, deletionToken, user.firstName);

      return {
        success: true,
        message: 'Account deletion request sent. Check your email to confirm.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Confirm account deletion
   * @param {string} email - User email
   * @param {string} deletionToken - Deletion token
   * @returns {Object} Success message
   */
  async confirmAccountDeletion(email, deletionToken) {
    try {
      const user = await User.findOne({
        where: { email }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.accountDeletionToken || !user.accountDeletionExpires) {
        throw new Error('No account deletion request found');
      }

      if (user.accountDeletionToken !== deletionToken) {
        throw new Error('Invalid deletion token');
      }

      if (new Date() > user.accountDeletionExpires) {
        throw new Error('Deletion token has expired');
      }

      await user.update({
        status: 'deleted',
        accountDeletionToken: null,
        accountDeletionExpires: null,
        deletedAt: new Date()
      });

      return {
        success: true,
        message: 'Account has been deleted successfully.'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send verification email using your email service
   */
  async sendVerificationEmail(email, verificationCode, firstName) {
    try {
      const subject = 'Verify Your Email - AWARI Projects';
      const context = {
        firstName,
        verificationCode,
        expiryMinutes: 10
      };

      await sendEmail(email, subject, '', 'email-verification', context);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Don't throw error here to avoid blocking registration
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, firstName) {
    try {
      const subject = 'Reset Your Password - AWARI Projects';
      const context = {
        firstName,
        resetToken,
        expiryHours: 1
      };

      await sendEmail(email, subject, '', 'password-reset', context);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(email, firstName) {
    try {
      const subject = 'Password Changed - AWARI Projects';
      const context = {
        firstName,
        changedAt: new Date().toLocaleString()
      };

      await sendEmail(email, subject, '', 'password-changed', context);
      console.log(`Password changed confirmation sent to ${email}`);
    } catch (error) {
      console.error('Error sending password changed email:', error);
    }
  }

  /**
   * Send account deletion email
   */
  async sendAccountDeletionEmail(email, deletionToken, firstName) {
    try {
      const subject = 'Confirm Account Deletion - AWARI Projects';
      const context = {
        firstName,
        deletionToken,
        expiryHours: 24
      };

      await sendEmail(email, subject, '', 'account-deletion', context);
      console.log(`Account deletion email sent to ${email}`);
    } catch (error) {
      console.error('Error sending account deletion email:', error);
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    return generateJWTToken(payload, '7d');
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  async verifyToken(token) {
    try {
      const { generateToken } = await import('../utils/index.js');
      return generateToken.verifyToken(token);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get current user profile
   * @param {string} userId - User ID
   * @returns {Object} User profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['passwordHash', 'emailVerificationCode', 'passwordResetToken', 'accountDeletionToken'] }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user profile
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const { passwordHash, email, role, status, emailVerificationCode, passwordResetToken, accountDeletionToken, ...safeUpdateData } = updateData;

      await user.update(safeUpdateData);

      const { passwordHash: _, emailVerificationCode: __, passwordResetToken: ___, accountDeletionToken: ____, ...userWithoutPassword } = user.toJSON();

      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh user token
   * @param {string} userId - User ID
   * @returns {string} New JWT token
   */
  async refreshToken(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      return this.generateToken(user);
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
