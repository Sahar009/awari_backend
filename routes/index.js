import express from 'express';
import authRoutes from './authRoutes.js';

const router = (app) => {
  app.use('/api/auth', authRoutes);

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