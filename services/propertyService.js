import { Property, PropertyMedia, User } from '../schema/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { deleteFromCloudinary, extractPublicId } from '../config/cloudinary.js';

/**
 * Property Service - Business logic for property management
 */
class PropertyService {
  /**
   * Create a new property
   */
  async createProperty(ownerId, propertyData, uploadResults = null) {
    try {
      // Check if owner exists
      const owner = await User.findByPk(ownerId);
      if (!owner) {
        throw new Error('Property owner not found');
      }

      // Generate slug from title
      const slug = this.generateSlug(propertyData.title);

      // Check if slug already exists
      const existingProperty = await Property.findOne({ where: { slug } });
      if (existingProperty) {
        throw new Error('A property with this title already exists');
      }

      // Prepare property data
      const propertyDataToCreate = {
        ownerId,
        title: propertyData.title,
        slug,
        description: propertyData.description,
        shortDescription: propertyData.shortDescription,
        propertyType: propertyData.propertyType,
        listingType: propertyData.listingType,
        price: propertyData.price,
        originalPrice: propertyData.originalPrice,
        currency: propertyData.currency || 'NGN',
        pricePeriod: propertyData.pricePeriod,
        negotiable: propertyData.negotiable || false,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        country: propertyData.country,
        postalCode: propertyData.postalCode,
        latitude: propertyData.latitude,
        longitude: propertyData.longitude,
        neighborhood: propertyData.neighborhood,
        landmark: propertyData.landmark,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        toilets: propertyData.toilets,
        parkingSpaces: propertyData.parkingSpaces,
        floorArea: propertyData.floorArea,
        landArea: propertyData.landArea,
        floorNumber: propertyData.floorNumber,
        totalFloors: propertyData.totalFloors,
        yearBuilt: propertyData.yearBuilt,
        conditionStatus: propertyData.conditionStatus,
        features: propertyData.features,
        amenities: propertyData.amenities,
        petFriendly: propertyData.petFriendly || false,
        smokingAllowed: propertyData.smokingAllowed || false,
        furnished: propertyData.furnished || false,
        availableFrom: propertyData.availableFrom,
        availableUntil: propertyData.availableUntil,
        minLeasePeriod: propertyData.minLeasePeriod,
        maxLeasePeriod: propertyData.maxLeasePeriod,
        minStayNights: propertyData.minStayNights || 1,
        maxStayNights: propertyData.maxStayNights,
        instantBooking: propertyData.instantBooking || false,
        cancellationPolicy: propertyData.cancellationPolicy || 'moderate',
        featured: propertyData.featured || false,
        featuredUntil: propertyData.featuredUntil,
        tags: propertyData.tags,
        seoTitle: propertyData.seoTitle,
        seoDescription: propertyData.seoDescription,
        seoKeywords: propertyData.seoKeywords,
        agentId: propertyData.agentId
      };

      // Create the property
      const property = await Property.create(propertyDataToCreate);

      // Handle media uploads if provided
      if (uploadResults && uploadResults.media && uploadResults.media.length > 0) {
        await this.addPropertyMedia(property.id, uploadResults.media);
      }

      // Fetch the created property with relations
      const createdProperty = await Property.findByPk(property.id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ]
      });

      return {
        success: true,
        message: 'Property created successfully',
        data: createdProperty
      };
    } catch (error) {
      // Clean up uploaded files if property creation fails
      if (uploadResults && uploadResults.media) {
        for (const media of uploadResults.media) {
          if (media.public_id) {
            await deleteFromCloudinary(media.public_id);
          }
        }
      }
      throw new Error(error.message || 'Failed to create property');
    }
  }

  /**
   * Get all properties with filtering and pagination
   */
  async getAllProperties(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        propertyType,
        listingType,
        status,
        city,
        state,
        country,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        furnished,
        petFriendly,
        featured,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        search
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (propertyType) whereClause.propertyType = propertyType;
      if (listingType) whereClause.listingType = listingType;
      if (status) whereClause.status = status;
      if (city) whereClause.city = city;
      if (state) whereClause.state = state;
      if (country) whereClause.country = country;
      if (bedrooms) whereClause.bedrooms = bedrooms;
      if (bathrooms) whereClause.bathrooms = bathrooms;
      if (furnished !== undefined) whereClause.furnished = furnished;
      if (petFriendly !== undefined) whereClause.petFriendly = petFriendly;
      if (featured !== undefined) whereClause.featured = featured;

      // Price range filter
      if (minPrice || maxPrice) {
        whereClause.price = {};
        if (minPrice) whereClause.price[Op.gte] = minPrice;
        if (maxPrice) whereClause.price[Op.lte] = maxPrice;
      }

      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { address: { [Op.iLike]: `%${search}%` } },
          { neighborhood: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Property.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          properties: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch properties');
    }
  }

  /**
   * Get properties by owner
   */
  async getPropertiesByOwner(ownerId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        propertyType,
        listingType
      } = options;

      const offset = (page - 1) * limit;

      const whereClause = { ownerId };
      if (status) whereClause.status = status;
      if (propertyType) whereClause.propertyType = propertyType;
      if (listingType) whereClause.listingType = listingType;

      const { count, rows } = await Property.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        success: true,
        data: {
          properties: rows,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch owner properties');
    }
  }

  /**
   * Get a specific property by ID
   */
  async getPropertyById(propertyId, incrementView = false) {
    try {
      const property = await Property.findByPk(propertyId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ]
      });

      if (!property) {
        throw new Error('Property not found');
      }

      // Increment view count if requested
      if (incrementView) {
        await property.increment('viewCount');
      }

      return {
        success: true,
        data: property
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch property');
    }
  }

  /**
   * Get property by slug
   */
  async getPropertyBySlug(slug, incrementView = false) {
    try {
      const property = await Property.findOne({
        where: { slug },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ]
      });

      if (!property) {
        throw new Error('Property not found');
      }

      // Increment view count if requested
      if (incrementView) {
        await property.increment('viewCount');
      }

      return {
        success: true,
        data: property
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch property');
    }
  }

  /**
   * Update a property
   */
  async updateProperty(propertyId, ownerId, updateData) {
    try {
      const property = await Property.findOne({
        where: {
          id: propertyId,
          ownerId
        }
      });

      if (!property) {
        throw new Error('Property not found or you do not have permission to update it');
      }

      // Only allow updates to draft or pending properties
      if (!['draft', 'pending'].includes(property.status)) {
        throw new Error('Only draft or pending properties can be updated');
      }

      // Generate new slug if title is being updated
      if (updateData.title && updateData.title !== property.title) {
        const newSlug = this.generateSlug(updateData.title);
        const existingProperty = await Property.findOne({ 
          where: { 
            slug: newSlug,
            id: { [Op.ne]: propertyId }
          } 
        });
        if (existingProperty) {
          throw new Error('A property with this title already exists');
        }
        updateData.slug = newSlug;
      }

      // Update the property
      await property.update(updateData);

      // Fetch updated property with relations
      const updatedProperty = await Property.findByPk(propertyId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: PropertyMedia,
            as: 'media',
            where: { isActive: true },
            required: false,
            order: [['order', 'ASC']]
          }
        ]
      });

      return {
        success: true,
        message: 'Property updated successfully',
        data: updatedProperty
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to update property');
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(propertyId, ownerId) {
    try {
      const property = await Property.findOne({
        where: {
          id: propertyId,
          ownerId
        },
        include: [
          {
            model: PropertyMedia,
            as: 'media'
          }
        ]
      });

      if (!property) {
        throw new Error('Property not found or you do not have permission to delete it');
      }

      // Only allow deletion of draft or pending properties
      if (!['draft', 'pending'].includes(property.status)) {
        throw new Error('Only draft or pending properties can be deleted');
      }

      // Clean up media files from Cloudinary
      if (property.media && property.media.length > 0) {
        for (const media of property.media) {
          if (media.url) {
            const publicId = extractPublicId(media.url);
            if (publicId) {
              await deleteFromCloudinary(publicId);
            }
          }
          if (media.thumbnailUrl) {
            const thumbnailPublicId = extractPublicId(media.thumbnailUrl);
            if (thumbnailPublicId) {
              await deleteFromCloudinary(thumbnailPublicId);
            }
          }
        }
      }

      // Delete the property (this will cascade delete media due to foreign key)
      await property.destroy();

      return {
        success: true,
        message: 'Property deleted successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete property');
    }
  }

  /**
   * Add media to property
   */
  async addPropertyMedia(propertyId, mediaData) {
    try {
      const mediaRecords = [];

      for (let i = 0; i < mediaData.length; i++) {
        const media = mediaData[i];
        const mediaRecord = await PropertyMedia.create({
          propertyId,
          mediaType: media.mediaType || 'image',
          url: media.secure_url,
          thumbnailUrl: media.thumbnailUrl,
          filename: media.filename,
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: media.bytes,
          width: media.width,
          height: media.height,
          order: i,
          isPrimary: i === 0, // First media is primary
          isActive: true
        });
        mediaRecords.push(mediaRecord);
      }

      return mediaRecords;
    } catch (error) {
      throw new Error(error.message || 'Failed to add property media');
    }
  }

  /**
   * Update property media order
   */
  async updateMediaOrder(propertyId, ownerId, mediaOrder) {
    try {
      const property = await Property.findOne({
        where: {
          id: propertyId,
          ownerId
        }
      });

      if (!property) {
        throw new Error('Property not found or you do not have permission to update it');
      }

      // Update media order
      for (const { mediaId, order, isPrimary } of mediaOrder) {
        await PropertyMedia.update(
          { order, isPrimary },
          { where: { id: mediaId, propertyId } }
        );
      }

      return {
        success: true,
        message: 'Media order updated successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to update media order');
    }
  }

  /**
   * Delete property media
   */
  async deletePropertyMedia(mediaId, ownerId) {
    try {
      const media = await PropertyMedia.findOne({
        where: { id: mediaId },
        include: [
          {
            model: Property,
            as: 'property',
            where: { ownerId }
          }
        ]
      });

      if (!media) {
        throw new Error('Media not found or you do not have permission to delete it');
      }

      // Clean up files from Cloudinary
      if (media.url) {
        const publicId = extractPublicId(media.url);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }
      if (media.thumbnailUrl) {
        const thumbnailPublicId = extractPublicId(media.thumbnailUrl);
        if (thumbnailPublicId) {
          await deleteFromCloudinary(thumbnailPublicId);
        }
      }

      await media.destroy();

      return {
        success: true,
        message: 'Media deleted successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete media');
    }
  }

  /**
   * Admin: Approve/reject property
   */
  async moderateProperty(propertyId, moderatorId, moderationData) {
    try {
      const property = await Property.findByPk(propertyId);

      if (!property) {
        throw new Error('Property not found');
      }

      if (property.status !== 'pending') {
        throw new Error('Only pending properties can be moderated');
      }

      const updateData = {
        status: moderationData.status,
        approvedBy: moderationData.status === 'active' ? moderatorId : null,
        approvedAt: moderationData.status === 'active' ? new Date() : null,
        rejectionReason: moderationData.status === 'rejected' ? moderationData.rejectionReason : null,
        moderationNotes: moderationData.moderationNotes
      };

      await property.update(updateData);

      // Fetch updated property with relations
      const updatedProperty = await Property.findByPk(propertyId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'firstName', 'lastName', 'email']
          }
        ]
      });

      return {
        success: true,
        message: `Property ${moderationData.status} successfully`,
        data: updatedProperty
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to moderate property');
    }
  }

  /**
   * Get property statistics
   */
  async getPropertyStatistics() {
    try {
      const stats = await Property.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const typeStats = await Property.findAll({
        attributes: [
          'propertyType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['propertyType'],
        raw: true
      });

      const listingTypeStats = await Property.findAll({
        attributes: [
          'listingType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['listingType'],
        raw: true
      });

      return {
        success: true,
        data: {
          statusStats: stats,
          propertyTypeStats: typeStats,
          listingTypeStats: listingTypeStats
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch property statistics');
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-') // Remove leading/trailing hyphens
      + '-' + Date.now(); // Add timestamp for uniqueness
  }
}

export default new PropertyService();
