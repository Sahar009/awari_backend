import newsletterService from '../services/newsletterService.js';
import { messageHandler } from '../utils/index.js';
import { validationResult } from 'express-validator';

class NewsletterController {
  /**
   * Subscribe to newsletter
   * POST /api/newsletter/subscribe
   */
  async subscribe(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          messageHandler('Please provide a valid email address', false, 400)
        );
      }

      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await newsletterService.subscribe(email, ipAddress);

      return res.status(201).json(
        messageHandler(result.message, true, 201)
      );
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      return res.status(400).json(
        messageHandler(error.message, false, 400)
      );
    }
  }

  /**
   * Unsubscribe from newsletter
   * GET /api/newsletter/unsubscribe (for email links)
   * POST /api/newsletter/unsubscribe (for API calls)
   */
  async unsubscribe(req, res) {
    try {
      const { email, token } = req.method === 'GET' ? req.query : req.body;

      if (!email) {
        const errorMsg = 'Email is required';
        
        if (req.method === 'GET') {
          return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Error - AWARI Projects</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .error { color: #dc3545; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="error">❌ Error</h1>
                <p>${errorMsg}</p>
              </div>
            </body>
            </html>
          `);
        }
        
        return res.status(400).json(messageHandler(errorMsg, false, 400));
      }

      const result = await newsletterService.unsubscribe(email, token);

      // If it's a GET request (from email link), return HTML page
      if (req.method === 'GET') {
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Unsubscribed - AWARI Projects</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .success { color: #28a745; }
              .btn { display: inline-block; padding: 12px 24px; background: #BE79DF; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">✅ Successfully Unsubscribed</h1>
              <p>${result.message}</p>
              <p>You will no longer receive newsletter emails from AWARI Projects.</p>
              <a href="https://awariprojects.com" class="btn">Visit Our Website</a>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(200).json(
        messageHandler(result.message, true, 200)
      );
    } catch (error) {
      console.error('Newsletter unsubscribe error:', error);
      
      if (req.method === 'GET') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Error - AWARI Projects</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">❌ Error</h1>
              <p>${error.message}</p>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(400).json(
        messageHandler(error.message, false, 400)
      );
    }
  }

  /**
   * Check subscription status
   * GET /api/newsletter/status/:email
   */
  async checkStatus(req, res) {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json(
          messageHandler('Email is required', false, 400)
        );
      }

      const result = await newsletterService.isSubscribed(email);

      return res.status(200).json(
        messageHandler('Status retrieved successfully', true, 200, result)
      );
    } catch (error) {
      console.error('Newsletter status check error:', error);
      return res.status(400).json(
        messageHandler(error.message, false, 400)
      );
    }
  }

  /**
   * Get subscribers list (Admin only)
   * GET /api/newsletter/subscribers
   */
  async getSubscribers(req, res) {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json(
          messageHandler('Access denied. Admin privileges required.', false, 403)
        );
      }

      const { page = 1, limit = 50 } = req.query;
      const result = await newsletterService.getSubscribers(page, limit);

      return res.status(200).json(
        messageHandler('Subscribers retrieved successfully', true, 200, result)
      );
    } catch (error) {
      console.error('Get subscribers error:', error);
      return res.status(400).json(
        messageHandler(error.message, false, 400)
      );
    }
  }
}

export default new NewsletterController();