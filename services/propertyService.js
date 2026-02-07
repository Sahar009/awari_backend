import { Property, PropertyMedia, User } from '../schema/index.js';
import { Op } from 'sequelize';
import sequelize from '../database/db.js';
import { deleteFromCloudinary, extractPublicId } from '../config/cloudinary.js';
import { sendTemplateNotification } from './notificationService.js';

/**
 * Property Service - Business logic for property management
 */
class PropertyService {
  /**
   * Create a new property
   */
  async createProperty(ownerId, propertyData, uploadResults = null) {
    try {
      console.log('\n🏗️ [PROPERTY SERVICE] ========== CREATE PROPERTY ==========');
      console.log('🏗️ [PROPERTY SERVICE] Owner ID:', ownerId);
      console.log('🏗️ [PROPERTY SERVICE] Property title:', propertyData.title);
      console.log('🏗️ [PROPERTY SERVICE] Property type:', propertyData.propertyType);
      console.log('🏗️ [PROPERTY SERVICE] Listing type:', propertyData.listingType);
      console.log('🏗️ [PROPERTY SERVICE] Has upload results:', !!uploadResults);
      console.log('🏗️ [PROPERTY SERVICE] Upload media count:', uploadResults?.media?.length || 0);

      // Check if owner exists
      console.log('🔍 [PROPERTY SERVICE] Checking if owner exists...');
      const owner = await User.findByPk(ownerId);
      if (!owner) {
        console.error('❌ [PROPERTY SERVICE] Owner not found:', ownerId);
        throw new Error('Property owner not found');
      }
      console.log('✅ [PROPERTY SERVICE] Owner found:', {
        id: owner.id,
        email: owner.email,
        status: owner.status
      });

      // Generate slug from title
      console.log('🔧 [PROPERTY SERVICE] Generating slug...');
      const slug = this.generateSlug(propertyData.title);
      console.log('✅ [PROPERTY SERVICE] Generated slug:', slug);

      // Check if slug already exists
      console.log('🔍 [PROPERTY SERVICE] Checking if slug exists...');
      const existingProperty = await Property.findOne({ where: { slug } });
      if (existingProperty) {
        console.error('❌ [PROPERTY SERVICE] Slug already exists:', slug);
        throw new Error('A property with this title already exists');
      }
      console.log('✅ [PROPERTY SERVICE] Slug is unique');

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

      // Handle video URL if present
      if (uploadResults && uploadResults.videos && uploadResults.videos.length > 0) {
        console.log('🎥 [PROPERTY SERVICE] Video detected, adding videoUrl');
        propertyDataToCreate.videoUrl = uploadResults.videos[0].secure_url;
        console.log('🎥 [PROPERTY SERVICE] Video URL:', uploadResults.videos[0].secure_url);
      }

      // Create the property
      console.log('🔄 [PROPERTY SERVICE] Creating property in database...');
      console.log('📝 [PROPERTY SERVICE] Property data to create:', {
        title: propertyDataToCreate.title,
        propertyType: propertyDataToCreate.propertyType,
        listingType: propertyDataToCreate.listingType,
        price: propertyDataToCreate.price,
        city: propertyDataToCreate.city,
        state: propertyDataToCreate.state,
        status: propertyDataToCreate.status || 'pending'
      });

      const property = await Property.create(propertyDataToCreate);
      console.log('✅ [PROPERTY SERVICE] Property created in database:', {
        id: property.id,
        title: property.title,
        status: property.status
      });

      // Handle media uploads if provided
      if (uploadResults && uploadResults.media && uploadResults.media.length > 0) {
        console.log('📸 [PROPERTY SERVICE] Adding property media...');
        console.log('📸 [PROPERTY SERVICE] Media count:', uploadResults.media.length);
        await this.addPropertyMedia(property.id, uploadResults.media);
        console.log('✅ [PROPERTY SERVICE] Media added successfully');
      } else {
        console.log('⚠️ [PROPERTY SERVICE] No media to add');
      }

      // Fetch the created property with relations
      console.log('🔍 [PROPERTY SERVICE] Fetching created property with relations...');
      const createdProperty = await Property.findByPk(property.id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            paranoid: false
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false
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
      console.log('✅ [PROPERTY SERVICE] Property fetched with relations:', {
        id: createdProperty.id,
        hasOwner: !!createdProperty.owner,
        hasAgent: !!createdProperty.agent,
        mediaCount: createdProperty.media?.length || 0
      });

      console.log('✅ [PROPERTY SERVICE] ========== PROPERTY CREATED SUCCESSFULLY ==========');
      return {
        success: true,
        message: 'Property created successfully',
        data: createdProperty
      };
    } catch (error) {
      console.error('\n❌ [PROPERTY SERVICE] ========== CREATE PROPERTY ERROR ==========');
      console.error('❌ [PROPERTY SERVICE] Error name:', error.name);
      console.error('❌ [PROPERTY SERVICE] Error message:', error.message);
      console.error('❌ [PROPERTY SERVICE] Error stack:', error.stack);

      // Clean up uploaded files if property creation fails
      if (uploadResults && uploadResults.media) {
        console.log('🧹 [PROPERTY SERVICE] Cleaning up uploaded files...');
        for (const media of uploadResults.media) {
          if (media.public_id) {
            try {
              await deleteFromCloudinary(media.public_id);
              console.log('✅ [PROPERTY SERVICE] Deleted file:', media.public_id);
            } catch (cleanupError) {
              console.error('❌ [PROPERTY SERVICE] Failed to delete file:', media.public_id, cleanupError);
            }
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
        search,
        checkInDate,
        checkOutDate
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause = {};
      if (propertyType) whereClause.propertyType = propertyType;
      if (listingType) {
        // Handle comma-separated values like "shortlet,hotel"
        const listingTypes = listingType.split(',').map(t => t.trim());
        if (listingTypes.length === 1) {
          whereClause.listingType = listingTypes[0];
        } else {
          whereClause.listingType = { [Op.in]: listingTypes };
        }
      }
      if (status) whereClause.status = status;
      // Use partial match for location filters (MySQL LIKE is case-insensitive by default)
      if (city) whereClause.city = { [Op.like]: `%${city}%` };
      if (state) whereClause.state = { [Op.like]: `%${state}%` };
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

      // Search filter (MySQL LIKE is case-insensitive by default)
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
          { neighborhood: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows } = await Property.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            paranoid: false // Include soft-deleted owners to check their status
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false // Include soft-deleted agents to check their status
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

      // Filter by availability if checkInDate and checkOutDate are provided
      let filteredProperties = rows;
      if (checkInDate && checkOutDate && (listingType === 'shortlet' || listingType === 'rent' || listingType === 'hotel' || listingType?.includes('shortlet') || listingType?.includes('hotel'))) {
        const { checkDateRangeAvailability } = await import('./availabilityService.js');
        const availabilityChecks = await Promise.all(
          rows.map(async (property) => {
            try {
              const availability = await checkDateRangeAvailability(property.id, checkInDate, checkOutDate);
              return { property, available: availability.available };
            } catch (error) {
              console.error(`Error checking availability for property ${property.id}:`, error);
              return { property, available: false };
            }
          })
        );
        filteredProperties = availabilityChecks
          .filter(check => check.available)
          .map(check => check.property);
      }

      return {
        success: true,
        data: {
          properties: filteredProperties,
          pagination: {
            total: checkInDate && checkOutDate ? filteredProperties.length : count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil((checkInDate && checkOutDate ? filteredProperties.length : count) / limit)
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

      // Get total count separately to avoid issues with joins
      const count = await Property.count({
        where: whereClause
      });

      // Get paginated properties with all associations
      const rows = await Property.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            paranoid: false // Include soft-deleted owners to check their status
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false // Include soft-deleted agents to check their status
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
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status'],
            required: false, // Don't fail if owner doesn't exist
            paranoid: false // Include soft-deleted owners to check their status
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status'],
            required: false,
            paranoid: false // Include soft-deleted agents to check their status
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

      // Convert Sequelize model to plain object to ensure all associations are properly serialized
      const propertyData = property.get({ plain: true });

      // Always try to fetch owner if ownerId exists and owner is not loaded
      // This ensures owner is always included even if association fails
      if (!propertyData.owner && propertyData.ownerId) {
        console.log('⚠️ [PROPERTY SERVICE] Owner not included in association, fetching manually:', {
          propertyId,
          ownerId: propertyData.ownerId
        });

        try {
          const ownerCheck = await User.findByPk(propertyData.ownerId, {
            paranoid: false,
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status', 'deletedAt']
          });

          if (ownerCheck) {
            // Convert owner to plain object
            const ownerData = ownerCheck.get({ plain: true });

            // If owner exists but is soft-deleted or inactive, still include it but log a warning
            if (ownerData.deletedAt) {
              console.warn('⚠️ [PROPERTY SERVICE] Property owner is soft-deleted:', {
                propertyId,
                ownerId: propertyData.ownerId,
                deletedAt: ownerData.deletedAt
              });
            }

            // Manually attach owner to propertyData
            propertyData.owner = ownerData;

            console.log('✅ [PROPERTY SERVICE] Owner manually attached:', {
              id: ownerData.id,
              firstName: ownerData.firstName,
              lastName: ownerData.lastName,
              email: ownerData.email,
            });
          } else {
            console.error('❌ [PROPERTY SERVICE] Property owner not found in database:', {
              propertyId,
              ownerId: propertyData.ownerId
            });
          }
        } catch (error) {
          console.error('❌ [PROPERTY SERVICE] Error fetching owner manually:', {
            propertyId,
            ownerId: propertyData.ownerId,
            error: error.message
          });
        }
      }

      console.log('🔍 [PROPERTY SERVICE] getPropertyById - Final property data:', {
        id: propertyData.id,
        title: propertyData.title,
        ownerId: propertyData.ownerId,
        hasOwner: !!propertyData.owner,
        owner: propertyData.owner ? {
          id: propertyData.owner.id,
          firstName: propertyData.owner.firstName,
          lastName: propertyData.owner.lastName,
          email: propertyData.owner.email,
        } : null,
      });

      return {
        success: true,
        data: propertyData
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
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status'],
            paranoid: false // Include soft-deleted owners to check their status
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status'],
            required: false,
            paranoid: false // Include soft-deleted agents to check their status
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

      // Check if owner exists but wasn't loaded (might be soft-deleted)
      if (!property) {
        throw new Error('Property not found');
      }

      if (!property.owner && property.ownerId) {
        const ownerCheck = await User.findByPk(property.ownerId, {
          paranoid: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl', 'status', 'deletedAt']
        });

        if (ownerCheck) {
          if (ownerCheck.deletedAt) {
            console.warn('⚠️ [PROPERTY SERVICE] Property owner is soft-deleted:', {
              slug,
              ownerId: property.ownerId,
              deletedAt: ownerCheck.deletedAt
            });
          }
          property.owner = ownerCheck;
        } else {
          console.error('❌ [PROPERTY SERVICE] Property owner not found in database:', {
            slug,
            ownerId: property.ownerId
          });
        }
      }

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
  async updateProperty(propertyId, ownerId, updateData, uploadResults = null) {
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
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            paranoid: false
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false
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
        moderationNotes: moderationData.moderationNotes
      };

      // Only set approvedBy when approving
      if (moderationData.status === 'active') {
        updateData.approvedBy = moderatorId;
        updateData.approvedAt = new Date();
      } else if (moderationData.status === 'rejected') {
        updateData.rejectionReason = moderationData.rejectionReason;
        updateData.approvedAt = null;
      }

      await property.update(updateData);

      // Fetch updated property with relations
      const updatedProperty = await Property.findByPk(propertyId, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            paranoid: false
          },
          {
            model: User,
            as: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatarUrl'],
            required: false,
            paranoid: false
          }
        ]
      });

      // Send notification to property owner
      try {
        const owner = updatedProperty.owner;
        if (owner) {
          if (moderationData.status === 'active') {
            await sendTemplateNotification('PROPERTY_APPROVED', owner, {
              property: updatedProperty
            });
          } else if (moderationData.status === 'rejected') {
            await sendTemplateNotification('PROPERTY_REJECTED', owner, {
              property: updatedProperty,
              reason: moderationData.rejectionReason
            });
          }
        }
      } catch (notificationError) {
        console.error('Error sending property moderation notification:', notificationError);
      }

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
