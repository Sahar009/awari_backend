import express from 'express';
import { body, param } from 'express-validator';
import newsletterController from '../controllers/newsletterController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     NewsletterSubscription:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         status:
 *           type: string
 *           enum: [subscribed, unsubscribed]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     tags: [Newsletter]
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
 *                 example: user@example.com
 *     responses:
 *       201:
 *         description: Successfully subscribed to newsletter
 *       400:
 *         description: Invalid email or already subscribed
 */
router.post('/subscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], newsletterController.subscribe);

/**
 * @swagger
 * /api/newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from newsletter
 *     tags: [Newsletter]
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
 *                 example: user@example.com
 *               token:
 *                 type: string
 *                 description: Optional unsubscribe token for security
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from newsletter
 *       400:
 *         description: Email not found or already unsubscribed
 *   get:
 *     summary: Unsubscribe from newsletter via email link
 *     tags: [Newsletter]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to unsubscribe
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Unsubscribe token for security
 *     responses:
 *       200:
 *         description: HTML page confirming unsubscription
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.post('/unsubscribe', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], newsletterController.unsubscribe);

router.get('/unsubscribe', newsletterController.unsubscribe);

/**
 * @swagger
 * /api/newsletter/status/{email}:
 *   get:
 *     summary: Check newsletter subscription status
 *     tags: [Newsletter]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address to check
 *     responses:
 *       200:
 *         description: Subscription status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscribed:
 *                   type: boolean
 *                 subscribedAt:
 *                   type: string
 *                   format: date-time
 */
router.get('/status/:email', [
  param('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], newsletterController.checkStatus);

/**
 * @swagger
 * /api/newsletter/subscribers:
 *   get:
 *     summary: Get newsletter subscribers (Admin only)
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of subscribers per page
 *     responses:
 *       200:
 *         description: Subscribers retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/subscribers', authenticateToken, newsletterController.getSubscribers);

export default router;