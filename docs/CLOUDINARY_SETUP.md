# Cloudinary Integration for KYC Document Uploads

This document explains how to set up and use Cloudinary for file uploads in the AWARI Projects KYC system.

## 🚀 **Setup**

### 1. **Environment Variables**

Add these environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 2. **Get Cloudinary Credentials**

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your Dashboard
3. Copy your Cloud Name, API Key, and API Secret
4. Add them to your `.env` file

## 📁 **File Upload Features**

### **Supported File Types**
- **Images**: JPEG, JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX
- **Maximum file size**: 10MB
- **Maximum files per request**: 2 (document + thumbnail)

### **Upload Endpoints**

#### **1. File Upload Endpoint**
```
POST /api/kyc/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form Data:**
- `documentType` (required): Document type
- `document` (required): Document file
- `thumbnail` (optional): Thumbnail image
- `documentNumber` (optional): Document number
- `expiresAt` (optional): Expiration date

#### **2. URL Upload Endpoint**
```
POST /api/kyc
Content-Type: application/json
Authorization: Bearer <token>
```

**JSON Body:**
```json
{
  "documentType": "passport",
  "documentUrl": "https://example.com/document.pdf",
  "documentThumbnail": "https://example.com/thumbnail.jpg",
  "documentNumber": "A1234567",
  "expiresAt": "2025-12-31"
}
```

## 🔧 **Usage Examples**

### **JavaScript/Fetch Example**

```javascript
// File upload
const formData = new FormData();
formData.append('documentType', 'passport');
formData.append('document', fileInput.files[0]);
formData.append('documentNumber', 'A1234567');

const response = await fetch('/api/kyc/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### **cURL Example**

```bash
# File upload
curl -X POST http://localhost:8000/api/kyc/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "documentType=passport" \
  -F "document=@/path/to/document.pdf" \
  -F "documentNumber=A1234567"

# URL upload
curl -X POST http://localhost:8000/api/kyc \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "passport",
    "documentUrl": "https://example.com/document.pdf",
    "documentNumber": "A1234567"
  }'
```

## 🗂️ **File Organization**

Files are organized in Cloudinary with the following structure:

```
awari-kyc/
├── document/          # Main documents
│   ├── passport_123.pdf
│   ├── national_id_456.jpg
│   └── ...
└── thumbnail/         # Thumbnail images
    ├── passport_123_thumb.jpg
    ├── national_id_456_thumb.jpg
    └── ...
```

## 🔄 **File Management**

### **Automatic Cleanup**
- Files are automatically deleted from Cloudinary when KYC documents are deleted
- Failed uploads are cleaned up automatically
- Only pending documents can be deleted (and their files)

### **File Optimization**
- Images are automatically optimized for web delivery
- Quality and format are automatically adjusted
- Thumbnails are generated with optimal dimensions

## 📊 **Response Format**

### **Successful Upload Response**
```json
{
  "success": true,
  "message": "KYC document submitted successfully",
  "data": {
    "id": "uuid-here",
    "userId": "user-uuid",
    "documentType": "passport",
    "documentUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/awari-kyc/document/passport_123.pdf",
    "documentThumbnail": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/awari-kyc/thumbnail/passport_123_thumb.jpg",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "File upload failed",
  "error": "File type image/gif is not allowed"
}
```

## 🛡️ **Security Features**

### **File Validation**
- File type validation (only allowed types)
- File size limits (10MB max)
- File count limits (2 files max)

### **Access Control**
- JWT authentication required
- Users can only upload to their own account
- Admins can view all documents

### **Error Handling**
- Comprehensive error messages
- Automatic file cleanup on errors
- Validation error details

## 🔍 **Testing**

### **Test File Upload**
1. Use Postman or similar tool
2. Set method to POST
3. Set URL to `/api/kyc/upload`
4. Add Authorization header with Bearer token
5. Use form-data with file upload
6. Test with different file types and sizes

### **Test URL Upload**
1. Use Postman or similar tool
2. Set method to POST
3. Set URL to `/api/kyc`
4. Add Authorization header with Bearer token
5. Set Content-Type to application/json
6. Send JSON body with document URLs

## 📝 **Notes**

- Files are stored securely in Cloudinary
- All uploads are logged for audit purposes
- Thumbnails are automatically generated for images
- PDF files are stored as raw files
- Images are optimized for web delivery
- Files are organized by type and user for easy management

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"File type not allowed"**
   - Check that your file type is in the allowed list
   - Ensure the file extension matches the MIME type

2. **"File too large"**
   - Reduce file size to under 10MB
   - Compress images before upload

3. **"Cloudinary upload failed"**
   - Check your Cloudinary credentials
   - Verify your Cloudinary account is active
   - Check your internet connection

4. **"Authentication required"**
   - Ensure you're sending a valid JWT token
   - Check that the token hasn't expired
   - Verify the Authorization header format

### **Debug Mode**
Enable debug logging by setting `NODE_ENV=development` in your `.env` file.
