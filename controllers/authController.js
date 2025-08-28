import authService from '../services/authService.js';
import { validationResult } from 'express-validator';

class AuthController {
  /**
   * User registration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
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

      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: result.message || 'User registered successfully',
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * User login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
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

      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Account is not active. Please contact support.') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Google Sign-In
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async googleSignIn(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Google ID token is required'
        });
      }

      const result = await authService.googleSignIn(idToken);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error('Google Sign-In error:', error);
      
      if (error.message === 'Invalid Google token') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Account is not active. Please contact support.') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Link Google account to existing user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async linkGoogleAccount(req, res) {
    try {
      const { idToken } = req.body;
      const userId = req.user.id;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Google ID token is required'
        });
      }

      const result = await authService.linkGoogleAccount(userId, idToken);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Link Google account error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid Google token') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'This Google account is already linked to another user') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Unlink Google account from user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unlinkGoogleAccount(req, res) {
    try {
      const userId = req.user.id;
      const result = await authService.unlinkGoogleAccount(userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Unlink Google account error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No Google account linked to this user') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot unlink Google account. Please set a password first.') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verify user email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyEmail(req, res) {
    try {
      const { email, verificationCode } = req.body;

      if (!email || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'Email and verification code are required'
        });
      }

      const result = await authService.verifyEmail(email, verificationCode);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Email verification error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Email already verified') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid verification code') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Resend verification email
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const result = await authService.resendVerificationEmail(email);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Email already verified') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Forgot password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const result = await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reset password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPassword(req, res) {
    try {
      const { email, resetToken, newPassword } = req.body;

      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, reset token, and new password are required'
        });
      }

      const result = await authService.resetPassword(email, resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No password reset request found') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid reset token') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Reset token has expired') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Request account deletion
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async requestAccountDeletion(req, res) {
    try {
      const { password } = req.body;
      const userId = req.user.id;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required for confirmation'
        });
      }

      const result = await authService.requestAccountDeletion(userId, password);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Request account deletion error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Password is incorrect') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Confirm account deletion
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async confirmAccountDeletion(req, res) {
    try {
      const { email, deletionToken } = req.body;

      if (!email || !deletionToken) {
        return res.status(400).json({
          success: false,
          message: 'Email and deletion token are required'
        });
      }

      const result = await authService.confirmAccountDeletion(email, deletionToken);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Confirm account deletion error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No account deletion request found') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid deletion token') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Deletion token has expired') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await authService.getProfile(userId);

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
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
      const updateData = req.body;
      const updatedUser = await authService.updateProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Change user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async changePassword(req, res) {
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
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Password change not available for Google-only accounts') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Refresh user token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refreshToken(req, res) {
    try {
      const userId = req.user.id;
      const newToken = await authService.refreshToken(userId);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { token: newToken }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Account is not active') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Logout user (client-side token removal)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // You could implement a blacklist for tokens if needed
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new AuthController();
