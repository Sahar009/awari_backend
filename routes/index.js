import express from 'express';
import authRoutes from './authRoutes.js';
import kycRoutes from './kycRoutes.js';
import propertyRoutes from './propertyRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import favoriteRoutes from './favoriteRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import { sendEmail } from '../modules/notifications/email.js';

const router = (app) => {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/kyc', kycRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/newsletter', newsletterRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/bookings', bookingRoutes);

  // Test email route
  app.get(`/api/test-email`, async (req, res) => {
    try {
        const result = await sendEmail({
            to: "sehindeshoes@gmail.com",
            subject: 'Test Email from Awari',
            template: 'test', 
            context: { name: 'Test User' }
        });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'AWARI Projects API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  });

  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to AWARI Projects API',
      documentation: '/api-docs',
      health: '/api/health'
    });
  });
};

export default router;