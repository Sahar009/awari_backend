import express from 'express';
import propertyController from '../controllers/propertyController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  createPropertyValidation,
  updatePropertyValidation,
  moderatePropertyValidation,
  updateMediaOrderValidation,
  propertyIdValidation,
  mediaIdValidation,
  propertySlugValidation,
  getPropertiesValidation,
  getOwnerPropertiesValidation,
  getAdminPropertiesValidation
} from '../validations/propertyValidation.js';
import {
  uploadPropertyMedia,
  uploadSinglePropertyMedia,
  processPropertyUploadedFiles,
  handlePropertyUploadError,
  validatePropertyFileUpload,
  validatePropertyFileCount,
  parseFormDataArrays
} from '../middlewares/propertyUploadMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - propertyType
 *         - listingType
 *         - price
 *         - address
 *         - city
 *         - state
 *         - country
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Property ID
 *         ownerId:
 *           type: string
 *           format: uuid
 *           description: Property owner ID
 *         agentId:
 *           type: string
 *           format: uuid
 *           description: Assigned agent ID
 *         title:
 *           type: string
 *           maxLength: 255
 *           description: Property title
 *         slug:
 *           type: string
 *           maxLength: 300
 *           description: URL-friendly property slug
 *         description:
 *           type: string
 *           description: Detailed property description
 *         shortDescription:
 *           type: string
 *           maxLength: 500
 *           description: Brief property description
 *         propertyType:
 *           type: string
 *           enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *           description: Type of property
 *         listingType:
 *           type: string
 *           enum: [rent, sale, shortlet]
 *           description: Listing type
 *         status:
 *           type: string
 *           enum: [draft, pending, active, inactive, sold, rented, rejected, archived]
 *           description: Property status
 *         price:
 *           type: number
 *           format: decimal
 *           description: Property price
 *         originalPrice:
 *           type: number
 *           format: decimal
 *           description: Original price before discount
 *         currency:
 *           type: string
 *           maxLength: 3
 *           default: NGN
 *           description: Currency code
 *         pricePeriod:
 *           type: string
 *           enum: [per_night, per_month, per_year, one_time]
 *           description: Price period
 *         negotiable:
 *           type: boolean
 *           default: false
 *           description: Whether price is negotiable
 *         address:
 *           type: string
 *           description: Property address
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: City
 *         state:
 *           type: string
 *           maxLength: 100
 *           description: State
 *         country:
 *           type: string
 *           maxLength: 100
 *           description: Country
 *         postalCode:
 *           type: string
 *           maxLength: 20
 *           description: Postal code
 *         latitude:
 *           type: number
 *           format: decimal
 *           description: Latitude coordinate
 *         longitude:
 *           type: number
 *           format: decimal
 *           description: Longitude coordinate
 *         neighborhood:
 *           type: string
 *           maxLength: 100
 *           description: Neighborhood
 *         landmark:
 *           type: string
 *           maxLength: 200
 *           description: Nearby landmark
 *         bedrooms:
 *           type: integer
 *           minimum: 0
 *           maximum: 50
 *           description: Number of bedrooms
 *         bathrooms:
 *           type: integer
 *           minimum: 0
 *           maximum: 20
 *           description: Number of bathrooms
 *         toilets:
 *           type: integer
 *           minimum: 0
 *           maximum: 20
 *           description: Number of toilets
 *         parkingSpaces:
 *           type: integer
 *           minimum: 0
 *           maximum: 20
 *           description: Number of parking spaces
 *         floorArea:
 *           type: number
 *           format: decimal
 *           description: Floor area in square meters
 *         landArea:
 *           type: number
 *           format: decimal
 *           description: Land area in square meters
 *         floorNumber:
 *           type: integer
 *           minimum: 0
 *           maximum: 200
 *           description: Floor number
 *         totalFloors:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           description: Total floors in building
 *         yearBuilt:
 *           type: integer
 *           minimum: 1800
 *           description: Year property was built
 *         conditionStatus:
 *           type: string
 *           enum: [new, excellent, good, fair, needs_renovation]
 *           description: Property condition
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: Property features
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           description: Property amenities
 *         petFriendly:
 *           type: boolean
 *           default: false
 *           description: Whether pets are allowed
 *         smokingAllowed:
 *           type: boolean
 *           default: false
 *           description: Whether smoking is allowed
 *         furnished:
 *           type: boolean
 *           default: false
 *           description: Whether property is furnished
 *         availableFrom:
 *           type: string
 *           format: date
 *           description: Available from date
 *         availableUntil:
 *           type: string
 *           format: date
 *           description: Available until date
 *         minLeasePeriod:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *           description: Minimum lease period in months
 *         maxLeasePeriod:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *           description: Maximum lease period in months
 *         minStayNights:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 1
 *           description: Minimum stay nights for shortlet
 *         maxStayNights:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           description: Maximum stay nights for shortlet
 *         instantBooking:
 *           type: boolean
 *           default: false
 *           description: Whether instant booking is allowed
 *         cancellationPolicy:
 *           type: string
 *           enum: [flexible, moderate, strict, super_strict]
 *           default: moderate
 *           description: Cancellation policy
 *         featured:
 *           type: boolean
 *           default: false
 *           description: Whether property is featured
 *         featuredUntil:
 *           type: string
 *           format: date-time
 *           description: Featured until date
 *         viewCount:
 *           type: integer
 *           default: 0
 *           description: Number of views
 *         favoriteCount:
 *           type: integer
 *           default: 0
 *           description: Number of favorites
 *         contactCount:
 *           type: integer
 *           default: 0
 *           description: Number of contacts
 *         approvedBy:
 *           type: string
 *           format: uuid
 *           description: ID of user who approved the property
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           description: Approval date
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection
 *         moderationNotes:
 *           type: string
 *           description: Moderation notes
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Property tags
 *         seoTitle:
 *           type: string
 *           maxLength: 255
 *           description: SEO title
 *         seoDescription:
 *           type: string
 *           maxLength: 500
 *           description: SEO description
 *         seoKeywords:
 *           type: array
 *           items:
 *             type: string
 *           description: SEO keywords
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 *     
 *     PropertyMedia:
 *       type: object
 *       required:
 *         - propertyId
 *         - mediaType
 *         - url
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Media ID
 *         propertyId:
 *           type: string
 *           format: uuid
 *           description: Property ID
 *         mediaType:
 *           type: string
 *           enum: [image, video, document]
 *           default: image
 *           description: Type of media
 *         url:
 *           type: string
 *           maxLength: 500
 *           description: Media URL
 *         thumbnailUrl:
 *           type: string
 *           maxLength: 500
 *           description: Thumbnail URL
 *         filename:
 *           type: string
 *           maxLength: 255
 *           description: Filename
 *         originalName:
 *           type: string
 *           maxLength: 255
 *           description: Original filename
 *         mimeType:
 *           type: string
 *           maxLength: 100
 *           description: MIME type
 *         size:
 *           type: integer
 *           description: File size in bytes
 *         width:
 *           type: integer
 *           description: Image/video width
 *         height:
 *           type: integer
 *           description: Image/video height
 *         duration:
 *           type: integer
 *           description: Video duration in seconds
 *         order:
 *           type: integer
 *           default: 0
 *           description: Display order
 *         isPrimary:
 *           type: boolean
 *           default: false
 *           description: Whether this is the primary media
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether media is active
 *         altText:
 *           type: string
 *           maxLength: 255
 *           description: Alt text for accessibility
 *         caption:
 *           type: string
 *           description: Media caption
 *         metadata:
 *           type: object
 *           description: Additional metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 *     
 *     PropertyResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Property'
 *     
 *     PropertiesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             properties:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 *             pagination:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *     
 *     MediaOrderItem:
 *       type: object
 *       required:
 *         - mediaId
 *         - order
 *         - isPrimary
 *       properties:
 *         mediaId:
 *           type: string
 *           format: uuid
 *           description: Media ID
 *         order:
 *           type: integer
 *           minimum: 0
 *           description: Display order
 *         isPrimary:
 *           type: boolean
 *           description: Whether this is the primary media
 *     
 *     ModerationData:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [active, rejected]
 *           description: Moderation status
 *         moderationNotes:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Moderation notes
 *         rejectionReason:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: Rejection reason (required if status is rejected)
 */

// Public routes (no authentication required)
/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties with filtering and pagination
 *     tags: [Properties]
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
 *           default: 10
 *         description: Number of properties per page
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [rent, sale, shortlet]
 *         description: Filter by listing type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, inactive, sold, rented, rejected, archived]
 *         description: Filter by status
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         description: Filter by number of bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         description: Filter by number of bathrooms
 *       - in: query
 *         name: furnished
 *         schema:
 *           type: boolean
 *         description: Filter by furnished status
 *       - in: query
 *         name: petFriendly
 *         schema:
 *           type: boolean
 *         description: Filter by pet friendly status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, price, viewCount, favoriteCount, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/', getPropertiesValidation, propertyController.getAllProperties);

/**
 * @swagger
 * /api/properties/my-properties:
 *   get:
 *     summary: Get current user's properties
 *     tags: [Properties]
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
 *           default: 10
 *         description: Number of properties per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, inactive, sold, rented, rejected, archived]
 *         description: Filter by status
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [rent, sale, shortlet]
 *         description: Filter by listing type
 *     responses:
 *       200:
 *         description: User properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/my-properties', authenticateToken, getOwnerPropertiesValidation, propertyController.getPropertiesByOwner);

/**
 * @swagger
 * /api/properties/{propertyId}:
 *   get:
 *     summary: Get a specific property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: incrementView
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to increment view count
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get('/:propertyId', propertyIdValidation, propertyController.getPropertyById);

/**
 * @swagger
 * /api/properties/slug/{slug}:
 *   get:
 *     summary: Get a property by slug
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Property slug
 *       - in: query
 *         name: incrementView
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to increment view count
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get('/slug/:slug', propertySlugValidation, propertyController.getPropertyBySlug);

// Protected routes (authentication required)
/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error or bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, createPropertyValidation, propertyController.createProperty);

/**
 * @swagger
 * /api/properties/upload:
 *   post:
 *     summary: Create a property with media uploads
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - propertyType
 *               - listingType
 *               - price
 *               - address
 *               - city
 *               - state
 *               - country
 *             properties:
 *               title:
 *                 type: string
 *                 description: Property title
 *               description:
 *                 type: string
 *                 description: Property description
 *               propertyType:
 *                 type: string
 *                 enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *                 description: Property type
 *               listingType:
 *                 type: string
 *                 enum: [rent, sale, shortlet]
 *                 description: Listing type
 *               price:
 *                 type: number
 *                 description: Property price
 *               address:
 *                 type: string
 *                 description: Property address
 *               city:
 *                 type: string
 *                 description: City
 *               state:
 *                 type: string
 *                 description: State
 *               country:
 *                 type: string
 *                 description: Country
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property images (max 8)
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property videos (max 2)
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property documents (max 3)
 *     responses:
 *       201:
 *         description: Property created successfully with media
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error or file upload error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Debug route to check user authentication
router.get('/debug/user-auth', authenticateToken, propertyController.checkUserAuth);

router.post('/upload', 
  authenticateToken, 
  uploadPropertyMedia, 
  handlePropertyUploadError,
  processPropertyUploadedFiles,
  parseFormDataArrays,
  validatePropertyFileCount(8, 2, 3),
  createPropertyValidation, 
  propertyController.createProperty
);


/**
 * @swagger
 * /api/properties/{propertyId}:
 *   put:
 *     summary: Update a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: Property updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error or bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found or no permission
 *       500:
 *         description: Internal server error
 */
router.put('/:propertyId', authenticateToken, propertyIdValidation, updatePropertyValidation, propertyController.updateProperty);

/**
 * @swagger
 * /api/properties/{propertyId}:
 *   delete:
 *     summary: Delete a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found or no permission
 *       500:
 *         description: Internal server error
 */
router.delete('/:propertyId', authenticateToken, propertyIdValidation, propertyController.deleteProperty);

/**
 * @swagger
 * /api/properties/{propertyId}/media:
 *   post:
 *     summary: Add media to a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property images (max 8)
 *               videos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property videos (max 2)
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Property documents (max 3)
 *     responses:
 *       201:
 *         description: Media added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PropertyMedia'
 *       400:
 *         description: Validation error or file upload error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No permission to add media
 *       500:
 *         description: Internal server error
 */
router.post('/:propertyId/media', 
  authenticateToken, 
  propertyIdValidation,
  uploadPropertyMedia, 
  handlePropertyUploadError,
  processPropertyUploadedFiles,
  validatePropertyFileUpload,
  validatePropertyFileCount(8, 2, 3),
  propertyController.addPropertyMedia
);

/**
 * @swagger
 * /api/properties/{propertyId}/media/order:
 *   put:
 *     summary: Update media order for a property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaOrder
 *             properties:
 *               mediaOrder:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MediaOrderItem'
 *     responses:
 *       200:
 *         description: Media order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found or no permission
 *       500:
 *         description: Internal server error
 */
router.put('/:propertyId/media/order', 
  authenticateToken, 
  propertyIdValidation, 
  updateMediaOrderValidation, 
  propertyController.updateMediaOrder
);

/**
 * @swagger
 * /api/properties/media/{mediaId}:
 *   delete:
 *     summary: Delete property media
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Media not found or no permission
 *       500:
 *         description: Internal server error
 */
router.delete('/media/:mediaId', authenticateToken, mediaIdValidation, propertyController.deletePropertyMedia);

// Admin routes
/**
 * @swagger
 * /api/properties/admin/all:
 *   get:
 *     summary: Get all properties (Admin only)
 *     tags: [Properties - Admin]
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
 *           default: 10
 *         description: Number of properties per page
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by owner ID
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [apartment, house, villa, condo, studio, penthouse, townhouse, duplex, bungalow, land, commercial, office, shop, warehouse]
 *         description: Filter by property type
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [rent, sale, shortlet]
 *         description: Filter by listing type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending, active, inactive, sold, rented, rejected, archived]
 *         description: Filter by status
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: integer
 *         description: Filter by number of bedrooms
 *       - in: query
 *         name: bathrooms
 *         schema:
 *           type: integer
 *         description: Filter by number of bathrooms
 *       - in: query
 *         name: furnished
 *         schema:
 *           type: boolean
 *         description: Filter by furnished status
 *       - in: query
 *         name: petFriendly
 *         schema:
 *           type: boolean
 *         description: Filter by pet friendly status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, price, viewCount, favoriteCount, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/all', authenticateToken, requireRole(['admin']), getAdminPropertiesValidation, propertyController.getAllPropertiesAdmin);

/**
 * @swagger
 * /api/properties/admin/{propertyId}:
 *   get:
 *     summary: Get a specific property (Admin only)
 *     tags: [Properties - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get('/admin/:propertyId', authenticateToken, requireRole(['admin']), propertyIdValidation, propertyController.getPropertyByIdAdmin);

/**
 * @swagger
 * /api/properties/admin/{propertyId}/moderate:
 *   put:
 *     summary: Moderate a property (approve/reject)
 *     tags: [Properties - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationData'
 *     responses:
 *       200:
 *         description: Property moderated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.put('/admin/:propertyId/moderate', 
  authenticateToken, 
  requireRole(['admin']), 
  propertyIdValidation, 
  moderatePropertyValidation, 
  propertyController.moderateProperty
);

/**
 * @swagger
 * /api/properties/admin/statistics:
 *   get:
 *     summary: Get property statistics (Admin only)
 *     tags: [Properties - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     statusStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     propertyTypeStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           propertyType:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     listingTypeStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           listingType:
 *                             type: string
 *                           count:
 *                             type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/statistics', authenticateToken, requireRole(['admin']), propertyController.getPropertyStatistics);

export default router;
