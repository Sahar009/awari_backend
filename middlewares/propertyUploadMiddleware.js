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
 * Process uploaded files and upload to Cloudinary
 */
export const processPropertyUploadedFiles = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }

    const uploadResults = {
      images: [],
      videos: [],
      documents: [],
      media: [] // Combined array for backward compatibility
    };

    // Process multiple files (from uploadPropertyMedia)
    if (req.files) {
      for (const [fieldName, files] of Object.entries(req.files)) {
        for (const file of files) {
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

          const result = await uploadToCloudinary(file.buffer, uploadOptions);
          
          // Add metadata
          const mediaData = {
            ...result,
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

      const result = await uploadToCloudinary(req.file.buffer, uploadOptions);
      
      // Add metadata
      const mediaData = {
        ...result,
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

    next();
  } catch (error) {
    console.error('Error processing uploaded files:', error);
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
  if (error instanceof multer.MulterError) {
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

  if (error.message.includes('File type')) {
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
