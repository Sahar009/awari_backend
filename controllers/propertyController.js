import propertyService from '../services/propertyService.js';
import { validationResult } from 'express-validator';

/**
 * Property Controller - Handles HTTP requests for property management
 */
class PropertyController {
  /**
   * Create a new property
   */
  async createProperty(req, res) {
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

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated. Please login first.'
        });
      }

      // Check if user ID exists
      if (!req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found. Please login again.'
        });
      }

      const ownerId = req.user.id;
      const propertyData = req.body;
      const uploadResults = req.uploadResults || null;

      console.log('Creating property for user ID:', ownerId);
      console.log('User object:', { id: req.user.id, email: req.user.email, role: req.user.role });

      const result = await propertyService.createProperty(ownerId, propertyData, uploadResults);

      res.status(201).json(result);
    } catch (error) {
      console.error('Property creation error:', error);
      
      // Handle foreign key constraint errors specifically
      if (error.message && error.message.includes('foreign key constraint fails')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID. Please logout and login again to refresh your session.'
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Debug: Check current user info
   */
  async checkUserAuth(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No user found in request'
        });
      }

      // Check if user exists in database
      const { User } = await import('../schema/index.js');
      const dbUser = await User.findByPk(req.user.id);

      return res.status(200).json({
        success: true,
        message: 'User authentication check',
        data: {
          requestUser: { 
            id: req.user.id, 
            email: req.user.email, 
            role: req.user.role 
          },
          userExistsInDB: !!dbUser,
          dbUserStatus: dbUser?.status || 'not found'
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking user auth',
        error: error.message
      });
    }
  }

  /**
   * Get all properties with filtering
   */
  async getAllProperties(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        propertyType: req.query.propertyType,
        listingType: req.query.listingType,
        status: req.query.status,
        city: req.query.city,
        state: req.query.state,
        country: req.query.country,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        bedrooms: req.query.bedrooms,
        bathrooms: req.query.bathrooms,
        furnished: req.query.furnished,
        petFriendly: req.query.petFriendly,
        featured: req.query.featured,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        search: req.query.search
      };

      const result = await propertyService.getAllProperties(options);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get properties by owner
   */
  async getPropertiesByOwner(req, res) {
    try {
      const ownerId = req.user.id;
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        propertyType: req.query.propertyType,
        listingType: req.query.listingType
      };

      const result = await propertyService.getPropertiesByOwner(ownerId, options);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get a specific property by ID
   */
  async getPropertyById(req, res) {
    try {
      const { propertyId } = req.params;
      const incrementView = req.query.incrementView === 'true';

      const result = await propertyService.getPropertyById(propertyId, incrementView);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get property by slug
   */
  async getPropertyBySlug(req, res) {
    try {
      const { slug } = req.params;
      const incrementView = req.query.incrementView === 'true';

      const result = await propertyService.getPropertyBySlug(slug, incrementView);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update a property
   */
  async updateProperty(req, res) {
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

      const { propertyId } = req.params;
      const ownerId = req.user.id;
      const updateData = req.body;

      const result = await propertyService.updateProperty(propertyId, ownerId, updateData);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found or you do not have permission to update it' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(req, res) {
    try {
      const { propertyId } = req.params;
      const ownerId = req.user.id;

      const result = await propertyService.deleteProperty(propertyId, ownerId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found or you do not have permission to delete it' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Add media to property
   */
  async addPropertyMedia(req, res) {
    try {
      const { propertyId } = req.params;
      const ownerId = req.user.id;
      const uploadResults = req.uploadResults;

      if (!uploadResults || !uploadResults.media) {
        return res.status(400).json({
          success: false,
          message: 'No media files uploaded'
        });
      }

      // Check if user owns the property
      const property = await propertyService.getPropertyById(propertyId);
      if (property.data.ownerId !== ownerId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add media to this property'
        });
      }

      const result = await propertyService.addPropertyMedia(propertyId, uploadResults.media);

      res.status(201).json({
        success: true,
        message: 'Media added successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update media order
   */
  async updateMediaOrder(req, res) {
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

      const { propertyId } = req.params;
      const ownerId = req.user.id;
      const { mediaOrder } = req.body;

      const result = await propertyService.updateMediaOrder(propertyId, ownerId, mediaOrder);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found or you do not have permission to update it' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Delete property media
   */
  async deletePropertyMedia(req, res) {
    try {
      const { mediaId } = req.params;
      const ownerId = req.user.id;

      const result = await propertyService.deletePropertyMedia(mediaId, ownerId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Media not found or you do not have permission to delete it' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get all properties with filtering
   */
  async getAllPropertiesAdmin(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        propertyType: req.query.propertyType,
        listingType: req.query.listingType,
        status: req.query.status,
        city: req.query.city,
        state: req.query.state,
        country: req.query.country,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        bedrooms: req.query.bedrooms,
        bathrooms: req.query.bathrooms,
        furnished: req.query.furnished,
        petFriendly: req.query.petFriendly,
        featured: req.query.featured,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
        search: req.query.search,
        ownerId: req.query.ownerId
      };

      const result = await propertyService.getAllProperties(options);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Moderate property (approve/reject)
   */
  async moderateProperty(req, res) {
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

      const { propertyId } = req.params;
      const moderatorId = req.user.id;
      const moderationData = req.body;

      const result = await propertyService.moderateProperty(propertyId, moderatorId, moderationData);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get property statistics
   */
  async getPropertyStatistics(req, res) {
    try {
      const result = await propertyService.getPropertyStatistics();

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Admin: Get a specific property (without owner restriction)
   */
  async getPropertyByIdAdmin(req, res) {
    try {
      const { propertyId } = req.params;

      const result = await propertyService.getPropertyById(propertyId);

      res.status(200).json(result);
    } catch (error) {
      const statusCode = error.message === 'Property not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new PropertyController();
