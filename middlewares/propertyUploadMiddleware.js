import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * Property Upload Middleware - Handles file uploads for property media
 */

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types for property media
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images (JPEG, PNG, WebP), videos (MP4, AVI, MOV, WMV), documents (PDF, DOC, DOCX)`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10 // Maximum 10 files per request
  }
});

/**
 * Multer middleware for property media uploads
 * Handles multiple files with different field names
 */
export const uploadPropertyMedia = upload.fields([
  { name: 'images', maxCount: 8 }, // Up to 8 images
  { name: 'videos', maxCount: 2 }, // Up to 2 videos
  { name: 'documents', maxCount: 3 } // Up to 3 documents
]);

/**
 * Multer middleware for single property media upload
 */
export const uploadSinglePropertyMedia = upload.single('media');

/**
 * Parse FormData array fields (handles both JSON strings and indexed fields)
 * This middleware should run after multer processes the files
 */
export const parseFormDataArrays = (req, res, next) => {
  try {
    console.log('\n🔄 [PARSE MIDDLEWARE] ========== PARSING FORMDATA ARRAYS ==========');
    console.log('🔄 [PARSE MIDDLEWARE] Request body keys:', Object.keys(req.body || {}));
    
    // Array fields that might come as JSON strings or indexed fields
    const arrayFields = ['features', 'amenities', 'roomTypes', 'hotelAmenities', 'tags', 'seoKeywords'];
    
    arrayFields.forEach(fieldName => {
      // First, check if it's already a JSON string (from frontend/mobile)
      if (req.body[fieldName] !== undefined && req.body[fieldName] !== null) {
        console.log(`🔍 [PARSE MIDDLEWARE] Checking ${fieldName}:`, {
          type: typeof req.body[fieldName],
          value: typeof req.body[fieldName] === 'string' 
            ? req.body[fieldName].substring(0, 100) 
            : req.body[fieldName],
          isString: typeof req.body[fieldName] === 'string',
          isArray: Array.isArray(req.body[fieldName])
        });
        
        if (typeof req.body[fieldName] === 'string') {
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(req.body[fieldName]);
            if (Array.isArray(parsed)) {
              req.body[fieldName] = parsed;
              console.log(`✅ [PARSE MIDDLEWARE] Parsed ${fieldName} from JSON string:`, parsed);
              return; // Skip indexed field check if JSON parsing succeeded
            } else {
              console.log(`⚠️ [PARSE MIDDLEWARE] ${fieldName} parsed but not an array:`, parsed);
            }
          } catch (e) {
            console.log(`⚠️ [PARSE MIDDLEWARE] ${fieldName} is not valid JSON, trying indexed fields:`, e.message);
            // Not valid JSON, continue to check for indexed fields
          }
        } else if (Array.isArray(req.body[fieldName])) {
          console.log(`✅ [PARSE MIDDLEWARE] ${fieldName} is already an array:`, req.body[fieldName]);
          return; // Already an array, no need to parse
        }
      }
      
      // Check if we have indexed fields like features[0], features[1] (from mobile)
      const indexedFields = Object.keys(req.body || {}).filter(key => 
        key.startsWith(`${fieldName}[`) && key.endsWith(']')
      );
      
      if (indexedFields.length > 0) {
        console.log(`🔄 [PARSE MIDDLEWARE] Found indexed ${fieldName} fields:`, indexedFields);
        
        // Extract values and sort by index
        const values = indexedFields
          .map(key => {
            const match = key.match(/\[(\d+)\]/);
            return match ? { index: parseInt(match[1]), value: req.body[key] } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.index - b.index)
          .map(item => item.value);
        
        // Set as array in req.body
        req.body[fieldName] = values;
        console.log(`✅ [PARSE MIDDLEWARE] Parsed ${fieldName} as array from indexed fields:`, values);
        
        // Remove indexed fields from req.body
        indexedFields.forEach(key => delete req.body[key]);
      }
    });
    
    // Parse boolean fields
    const booleanFields = ['negotiable', 'furnished', 'petFriendly', 'smokingAllowed', 'instantBooking', 'featured'];
    booleanFields.forEach(fieldName => {
      if (req.body[fieldName] !== undefined) {
        if (typeof req.body[fieldName] === 'string') {
          req.body[fieldName] = req.body[fieldName].toLowerCase() === 'true';
          console.log(`✅ [PARSE MIDDLEWARE] Parsed ${fieldName} as boolean:`, req.body[fieldName]);
        }
      }
    });
    
    // Parse numeric fields
    const numericFields = ['price', 'originalPrice', 'bedrooms', 'bathrooms', 'toilets', 'parkingSpaces', 
                          'floorArea', 'landArea', 'floorNumber', 'totalFloors', 'yearBuilt', 
                          'numberOfRooms', 'maxGuestsPerRoom', 'starRating', 'minLeasePeriod', 
                          'maxLeasePeriod', 'minStayNights', 'maxStayNights'];
    numericFields.forEach(fieldName => {
      if (req.body[fieldName] !== undefined && req.body[fieldName] !== null && req.body[fieldName] !== '') {
        const numValue = parseFloat(req.body[fieldName]);
        if (!isNaN(numValue)) {
          // Check if it should be an integer
          if (['bedrooms', 'bathrooms', 'toilets', 'parkingSpaces', 'floorNumber', 'totalFloors', 
               'yearBuilt', 'numberOfRooms', 'maxGuestsPerRoom', 'starRating', 
               'minLeasePeriod', 'maxLeasePeriod', 'minStayNights', 'maxStayNights'].includes(fieldName)) {
            req.body[fieldName] = parseInt(req.body[fieldName], 10);
          } else {
            req.body[fieldName] = numValue;
          }
          console.log(`✅ [PARSE MIDDLEWARE] Parsed ${fieldName} as number:`, req.body[fieldName]);
        }
      } else if (req.body[fieldName] === '') {
        // Empty string should be undefined
        delete req.body[fieldName];
      }
    });
    
    console.log('✅ [PARSE MIDDLEWARE] ========== PARSING COMPLETE ==========');
    console.log('✅ [PARSE MIDDLEWARE] Final body keys:', Object.keys(req.body || {}));
    
    next();
  } catch (error) {
    console.error('❌ [PARSE MIDDLEWARE] Error parsing FormData arrays:', error);
    next(error);
  }
};

/**
 * Process uploaded files and upload to Cloudinary
 */
export const processPropertyUploadedFiles = async (req, res, next) => {
  try {
    console.log('\n📁 [UPLOAD MIDDLEWARE] ========== PROCESSING UPLOADED FILES ==========');
    console.log('📁 [UPLOAD MIDDLEWARE] Has req.files:', !!req.files);
    console.log('📁 [UPLOAD MIDDLEWARE] Has req.file:', !!req.file);
    console.log('📁 [UPLOAD MIDDLEWARE] Content-Type:', req.headers['content-type']);
    console.log('📁 [UPLOAD MIDDLEWARE] Content-Length:', req.headers['content-length']);
    
    if (!req.files && !req.file) {
      console.log('⚠️ [UPLOAD MIDDLEWARE] No files found, continuing...');
      return next();
    }
    
    if (req.files) {
      console.log('📁 [UPLOAD MIDDLEWARE] Files received:', Object.keys(req.files));
      Object.entries(req.files).forEach(([fieldName, files]) => {
        console.log(`📁 [UPLOAD MIDDLEWARE] ${fieldName}: ${files.length} file(s)`);
        files.forEach((file, index) => {
          console.log(`  - File ${index + 1}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
        });
      });
    }

    const uploadResults = {
      images: [],
      videos: [],
      documents: [],
      media: [] // Combined array for backward compatibility
    };

    // Process multiple files (from uploadPropertyMedia)
    if (req.files) {
      console.log('📤 [UPLOAD MIDDLEWARE] Processing files for Cloudinary upload...');
      for (const [fieldName, files] of Object.entries(req.files)) {
        console.log(`📤 [UPLOAD MIDDLEWARE] Processing ${fieldName} field with ${files.length} file(s)`);
        for (const file of files) {
          console.log(`📤 [UPLOAD MIDDLEWARE] Uploading: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
          
          const uploadOptions = {
            folder: `properties/${fieldName}`,
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto'
          };

          // Add specific options based on file type
          if (file.mimetype.startsWith('image/')) {
            uploadOptions.quality = 80;
            uploadOptions.fetch_format = 'auto';
          } else if (file.mimetype.startsWith('video/')) {
            uploadOptions.resource_type = 'video';
            uploadOptions.quality = 'auto';
          }

          uploadOptions.mimeType = file.mimetype;
          
          console.log(`📤 [UPLOAD MIDDLEWARE] Uploading to Cloudinary: ${file.originalname}`);
          const result = await uploadToCloudinary(file.buffer, uploadOptions);
          
          if (!result.success || !result.data) {
            console.error(`❌ [UPLOAD MIDDLEWARE] Cloudinary upload failed: ${file.originalname}`);
            throw new Error(`Failed to upload ${file.originalname}: ${result.error || 'Unknown error'}`);
          }
          
          console.log(`✅ [UPLOAD MIDDLEWARE] Cloudinary upload successful: ${file.originalname}`);
          
          const mediaData = {
            ...result.data,  // This contains secure_url, public_id, etc.
            originalName: file.originalname,
            mimeType: file.mimetype,
            bytes: file.size,
            mediaType: file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' : 'document'
          };

          uploadResults[fieldName].push(mediaData);
          uploadResults.media.push(mediaData);
        }
      }
    }

    // Process single file (from uploadSinglePropertyMedia)
    if (req.file) {
      const uploadOptions = {
        folder: 'properties/media',
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto'
      };

      // Add specific options based on file type
      if (req.file.mimetype.startsWith('image/')) {
        uploadOptions.quality = 80;
        uploadOptions.fetch_format = 'auto';
      } else if (req.file.mimetype.startsWith('video/')) {
        uploadOptions.resource_type = 'video';
        uploadOptions.quality = 'auto';
      }

      // Add MIME type to upload options for proper data URI creation
      uploadOptions.mimeType = req.file.mimetype;
      
      const result = await uploadToCloudinary(req.file.buffer, uploadOptions);
      
      // Check if upload was successful
      if (!result.success || !result.data) {
        throw new Error(`Failed to upload ${req.file.originalname}: ${result.error || 'Unknown error'}`);
      }
      
      // Add metadata - flatten the data structure
      const mediaData = {
        ...result.data,  // This contains secure_url, public_id, etc.
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        bytes: req.file.size,
        mediaType: req.file.mimetype.startsWith('image/') ? 'image' : 
                  req.file.mimetype.startsWith('video/') ? 'video' : 'document'
      };

      uploadResults.media.push(mediaData);
    }

    // Store results in request object
    req.uploadResults = uploadResults;

    console.log('✅ [UPLOAD MIDDLEWARE] ========== FILES PROCESSED SUCCESSFULLY ==========');
    console.log('✅ [UPLOAD MIDDLEWARE] Total images:', uploadResults.images.length);
    console.log('✅ [UPLOAD MIDDLEWARE] Total videos:', uploadResults.videos.length);
    console.log('✅ [UPLOAD MIDDLEWARE] Total documents:', uploadResults.documents.length);
    console.log('✅ [UPLOAD MIDDLEWARE] Total media:', uploadResults.media.length);

    next();
  } catch (error) {
    console.error('\n❌ [UPLOAD MIDDLEWARE] ========== FILE PROCESSING ERROR ==========');
    console.error('❌ [UPLOAD MIDDLEWARE] Error:', error.message);
    console.error('❌ [UPLOAD MIDDLEWARE] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error processing uploaded files',
      error: error.message
    });
  }
};

/**
 * Error handler for multer-specific errors
 */
export const handlePropertyUploadError = (error, req, res, next) => {
  if (error) {
    console.error('\n❌ [UPLOAD ERROR HANDLER] ========== UPLOAD ERROR ==========');
    console.error('❌ [UPLOAD ERROR HANDLER] Error type:', error.constructor.name);
    console.error('❌ [UPLOAD ERROR HANDLER] Error message:', error.message);
    console.error('❌ [UPLOAD ERROR HANDLER] Error code:', error.code);
    console.error('❌ [UPLOAD ERROR HANDLER] Request method:', req.method);
    console.error('❌ [UPLOAD ERROR HANDLER] Request URL:', req.originalUrl);
    console.error('❌ [UPLOAD ERROR HANDLER] Content-Type:', req.headers['content-type']);
  }
  
  if (error instanceof multer.MulterError) {
    console.error('❌ [UPLOAD ERROR HANDLER] Multer error detected:', error.code);
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large. Maximum size is 50MB per file.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum 10 files per request.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the request.';
        break;
      default:
        message = `File upload error: ${error.message}`;
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.code
    });
  }

  if (error && error.message && error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

/**
 * Validation middleware to check if files were uploaded
 */
export const validatePropertyFileUpload = (req, res, next) => {
  if (!req.uploadResults || !req.uploadResults.media || req.uploadResults.media.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }
  next();
};

/**
 * Validation middleware to check file count limits
 */
export const validatePropertyFileCount = (maxImages = 8, maxVideos = 2, maxDocuments = 3) => {
  return (req, res, next) => {
    if (req.uploadResults) {
      const { images = [], videos = [], documents = [] } = req.uploadResults;
      
      if (images.length > maxImages) {
        return res.status(400).json({
          success: false,
          message: `Too many images. Maximum ${maxImages} images allowed.`
        });
      }
      
      if (videos.length > maxVideos) {
        return res.status(400).json({
          success: false,
          message: `Too many videos. Maximum ${maxVideos} videos allowed.`
        });
      }
      
      if (documents.length > maxDocuments) {
        return res.status(400).json({
          success: false,
          message: `Too many documents. Maximum ${maxDocuments} documents allowed.`
        });
      }
    }
    
    next();
  };
};
