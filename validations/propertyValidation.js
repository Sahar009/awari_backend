import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating properties
 */
export const createPropertyValidation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),

  body('propertyType')
    .isIn(['apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'])
    .withMessage('Invalid property type'),

  body('listingType')
    .isIn(['rent', 'sale', 'shortlet', 'hotel'])
    .withMessage('Invalid listing type'),

  body('price')
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number')
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),

  body('originalPrice')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Original price must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Original price must be greater than 0');
      }
      return true;
    }),

  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),

  body('pricePeriod')
    .optional()
    .isIn(['per_night', 'per_month', 'per_year', 'one_time'])
    .withMessage('Invalid price period'),

  body('negotiable')
    .optional()
    .isBoolean()
    .withMessage('Negotiable must be a boolean value'),

  // Location validation
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),

  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),

  body('state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),

  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),

  body('postalCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),

  body('latitude')
    .optional()
    .isDecimal()
    .withMessage('Latitude must be a valid decimal number')
    .custom((value) => {
      if (value && (parseFloat(value) < -90 || parseFloat(value) > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),

  body('longitude')
    .optional()
    .isDecimal()
    .withMessage('Longitude must be a valid decimal number')
    .custom((value) => {
      if (value && (parseFloat(value) < -180 || parseFloat(value) > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }
      return true;
    }),

  body('neighborhood')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Neighborhood cannot exceed 100 characters'),

  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Landmark cannot exceed 200 characters'),

  // Property details validation
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Bedrooms must be between 0 and 50'),

  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),

  body('toilets')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Toilets must be between 0 and 20'),

  body('parkingSpaces')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Parking spaces must be between 0 and 20'),

  body('floorArea')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Floor area must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Floor area must be greater than 0');
      }
      return true;
    }),

  body('landArea')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Land area must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Land area must be greater than 0');
      }
      return true;
    }),

  body('floorNumber')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200'),

  body('totalFloors')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Total floors must be between 1 and 200'),

  body('yearBuilt')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Year built must be between 1800 and current year + 5'),

  body('conditionStatus')
    .optional()
    .isIn(['new', 'excellent', 'good', 'fair', 'needs_renovation'])
    .withMessage('Invalid condition status'),

  // Features and amenities
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),

  body('petFriendly')
    .optional()
    .isBoolean()
    .withMessage('Pet friendly must be a boolean value'),

  body('smokingAllowed')
    .optional()
    .isBoolean()
    .withMessage('Smoking allowed must be a boolean value'),

  body('furnished')
    .optional()
    .isBoolean()
    .withMessage('Furnished must be a boolean value'),

  // Availability
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available from must be a valid date'),

  body('availableUntil')
    .optional()
    .isISO8601()
    .withMessage('Available until must be a valid date'),

  body('minLeasePeriod')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Minimum lease period must be between 1 and 120 months'),

  body('maxLeasePeriod')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Maximum lease period must be between 1 and 120 months'),

  // Shortlet specific
  body('minStayNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Minimum stay nights must be between 1 and 365'),

  body('maxStayNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Maximum stay nights must be between 1 and 365'),

  body('instantBooking')
    .optional()
    .isBoolean()
    .withMessage('Instant booking must be a boolean value'),

  body('cancellationPolicy')
    .optional()
    .isIn(['flexible', 'moderate', 'strict', 'super_strict'])
    .withMessage('Invalid cancellation policy'),

  // SEO and visibility
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  body('featuredUntil')
    .optional()
    .isISO8601()
    .withMessage('Featured until must be a valid date'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('SEO title cannot exceed 255 characters'),

  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('SEO description cannot exceed 500 characters'),

  body('seoKeywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array'),

  body('agentId')
    .optional()
    .isUUID()
    .withMessage('Agent ID must be a valid UUID')
];

/**
 * Validation rules for updating properties
 */
export const updatePropertyValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),

  body('propertyType')
    .optional()
    .isIn(['apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'])
    .withMessage('Invalid property type'),

  body('listingType')
    .optional()
    .isIn(['rent', 'sale', 'shortlet', 'hotel'])
    .withMessage('Invalid listing type'),

  body('price')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Price must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Price must be greater than 0');
      }
      return true;
    }),

  body('originalPrice')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Original price must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Original price must be greater than 0');
      }
      return true;
    }),

  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-character code'),

  body('pricePeriod')
    .optional()
    .isIn(['per_night', 'per_month', 'per_year', 'one_time'])
    .withMessage('Invalid price period'),

  body('negotiable')
    .optional()
    .isBoolean()
    .withMessage('Negotiable must be a boolean value'),

  // Location validation
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),

  body('postalCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Postal code must be between 3 and 20 characters'),

  body('latitude')
    .optional()
    .isDecimal()
    .withMessage('Latitude must be a valid decimal number')
    .custom((value) => {
      if (value && (parseFloat(value) < -90 || parseFloat(value) > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),

  body('longitude')
    .optional()
    .isDecimal()
    .withMessage('Longitude must be a valid decimal number')
    .custom((value) => {
      if (value && (parseFloat(value) < -180 || parseFloat(value) > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }
      return true;
    }),

  body('neighborhood')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Neighborhood cannot exceed 100 characters'),

  body('landmark')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Landmark cannot exceed 200 characters'),

  // Property details validation
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Bedrooms must be between 0 and 50'),

  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),

  body('toilets')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Toilets must be between 0 and 20'),

  body('parkingSpaces')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Parking spaces must be between 0 and 20'),

  body('floorArea')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Floor area must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Floor area must be greater than 0');
      }
      return true;
    }),

  body('landArea')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Land area must be a valid decimal number')
    .custom((value) => {
      if (value && parseFloat(value) <= 0) {
        throw new Error('Land area must be greater than 0');
      }
      return true;
    }),

  body('floorNumber')
    .optional()
    .isInt({ min: 0, max: 200 })
    .withMessage('Floor number must be between 0 and 200'),

  body('totalFloors')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Total floors must be between 1 and 200'),

  body('yearBuilt')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 5 })
    .withMessage('Year built must be between 1800 and current year + 5'),

  body('conditionStatus')
    .optional()
    .isIn(['new', 'excellent', 'good', 'fair', 'needs_renovation'])
    .withMessage('Invalid condition status'),

  // Features and amenities
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),

  body('petFriendly')
    .optional()
    .isBoolean()
    .withMessage('Pet friendly must be a boolean value'),

  body('smokingAllowed')
    .optional()
    .isBoolean()
    .withMessage('Smoking allowed must be a boolean value'),

  body('furnished')
    .optional()
    .isBoolean()
    .withMessage('Furnished must be a boolean value'),

  // Availability
  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available from must be a valid date'),

  body('availableUntil')
    .optional()
    .isISO8601()
    .withMessage('Available until must be a valid date'),

  body('minLeasePeriod')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Minimum lease period must be between 1 and 120 months'),

  body('maxLeasePeriod')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Maximum lease period must be between 1 and 120 months'),

  // Shortlet specific
  body('minStayNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Minimum stay nights must be between 1 and 365'),

  body('maxStayNights')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Maximum stay nights must be between 1 and 365'),

  body('instantBooking')
    .optional()
    .isBoolean()
    .withMessage('Instant booking must be a boolean value'),

  body('cancellationPolicy')
    .optional()
    .isIn(['flexible', 'moderate', 'strict', 'super_strict'])
    .withMessage('Invalid cancellation policy'),

  // SEO and visibility
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  body('featuredUntil')
    .optional()
    .isISO8601()
    .withMessage('Featured until must be a valid date'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('SEO title cannot exceed 255 characters'),

  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('SEO description cannot exceed 500 characters'),

  body('seoKeywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array'),

  body('agentId')
    .optional()
    .isUUID()
    .withMessage('Agent ID must be a valid UUID')
];

/**
 * Validation rules for moderating properties (Admin only)
 */
export const moderatePropertyValidation = [
  body('status')
    .isIn(['active', 'rejected'])
    .withMessage('Status must be either "active" or "rejected"'),

  body('moderationNotes')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Moderation notes must be between 10 and 1000 characters'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters')
    .custom((value, { req }) => {
      if (req.body.status === 'rejected' && !value) {
        throw new Error('Rejection reason is required when status is rejected');
      }
      return true;
    })
];

/**
 * Validation rules for updating media order
 */
export const updateMediaOrderValidation = [
  body('mediaOrder')
    .isArray({ min: 1 })
    .withMessage('Media order must be a non-empty array'),

  body('mediaOrder.*.mediaId')
    .isUUID()
    .withMessage('Each media ID must be a valid UUID'),

  body('mediaOrder.*.order')
    .isInt({ min: 0 })
    .withMessage('Each order must be a non-negative integer'),

  body('mediaOrder.*.isPrimary')
    .isBoolean()
    .withMessage('Each isPrimary must be a boolean value')
];

/**
 * Validation rules for property ID parameter
 */
export const propertyIdValidation = [
  param('propertyId')
    .isUUID()
    .withMessage('Invalid property ID format')
];

/**
 * Validation rules for media ID parameter
 */
export const mediaIdValidation = [
  param('mediaId')
    .isUUID()
    .withMessage('Invalid media ID format')
];

/**
 * Validation rules for property slug parameter
 */
export const propertySlugValidation = [
  param('slug')
    .isLength({ min: 1, max: 300 })
    .withMessage('Invalid slug format')
];

/**
 * Validation rules for pagination
 */
export const propertyPaginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'price', 'viewCount', 'favoriteCount', 'title'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"')
];

/**
 * Validation rules for property filtering
 */
export const propertyFilterValidation = [
  query('propertyType')
    .optional()
    .isIn(['apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'])
    .withMessage('Invalid property type filter'),

  query('listingType')
    .optional()
    .custom((value) => {
      // Handle comma-separated values like "shortlet,hotel"
      const types = value.split(',').map(t => t.trim());
      const validTypes = ['rent', 'sale', 'shortlet', 'hotel'];
      const invalidTypes = types.filter(t => !validTypes.includes(t));
      if (invalidTypes.length > 0) {
        throw new Error(`Invalid listing type(s): ${invalidTypes.join(', ')}`);
      }
      return true;
    })
    .withMessage('Invalid listing type filter'),

  query('status')
    .optional()
    .isIn(['draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'rejected', 'archived'])
    .withMessage('Invalid status filter'),

  query('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City filter must be between 2 and 100 characters'),

  query('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State filter must be between 2 and 100 characters'),

  query('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country filter must be between 2 and 100 characters'),

  query('minPrice')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Minimum price must be a valid decimal number'),

  query('maxPrice')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Maximum price must be a valid decimal number'),

  query('bedrooms')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Bedrooms filter must be between 0 and 50'),

  query('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms filter must be between 0 and 20'),

  query('furnished')
    .optional()
    .isBoolean()
    .withMessage('Furnished filter must be a boolean value'),

  query('petFriendly')
    .optional()
    .isBoolean()
    .withMessage('Pet friendly filter must be a boolean value'),

  query('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured filter must be a boolean value'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),

  query('ownerId')
    .optional()
    .isUUID()
    .withMessage('Owner ID filter must be a valid UUID'),

  query('incrementView')
    .optional()
    .isBoolean()
    .withMessage('Increment view must be a boolean value')
];

/**
 * Combined validation for property listing endpoint
 */
export const getPropertiesValidation = [
  ...propertyPaginationValidation,
  ...propertyFilterValidation
];

/**
 * Combined validation for owner properties endpoint
 */
export const getOwnerPropertiesValidation = [
  ...propertyPaginationValidation,
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'active', 'inactive', 'sold', 'rented', 'rejected', 'archived'])
    .withMessage('Invalid status filter'),
  query('propertyType')
    .optional()
    .isIn(['apartment', 'house', 'villa', 'condo', 'studio', 'penthouse', 'townhouse', 'duplex', 'bungalow', 'land', 'commercial', 'office', 'shop', 'warehouse'])
    .withMessage('Invalid property type filter'),
  query('listingType')
    .optional()
    .isIn(['rent', 'sale', 'shortlet', 'hotel'])
    .withMessage('Invalid listing type filter')
];

/**
 * Combined validation for admin properties endpoint
 */
export const getAdminPropertiesValidation = [
  ...propertyPaginationValidation,
  ...propertyFilterValidation
];
