# AWARI Projects - Real Estate & Shortlet Platform

A comprehensive real estate and shortlet platform built with Node.js, Express, and MySQL.

## 🚀 Features

### Authentication System
- **User Registration & Login** - Secure password-based authentication
- **Google Sign-In** - OAuth2 integration with Google
- **Email Verification** - 4-digit verification codes
- **Password Recovery** - Forgot password and reset functionality
- **Account Management** - Profile updates, password changes, account deletion
- **JWT Authentication** - Secure token-based sessions

### User Management
- **Role-Based Access Control** - Renter, Buyer, Landlord, Agent, Hotel Provider, Admin
- **Profile Management** - Comprehensive user profiles with preferences
- **KYC Verification** - Identity verification system
- **Account Status Management** - Pending, Active, Suspended, Banned, Deleted

### Real Estate Features
- **Property Listings** - Comprehensive property management
- **Media Management** - Property photos and videos
- **Booking System** - Property inspection and rental bookings
- **Review System** - User ratings and feedback
- **Payment Processing** - Secure payment handling
- **Messaging System** - In-app communication

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT, bcrypt, Google OAuth2
- **Email**: Nodemailer with Handlebars templates
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🚀 Quick Setup (Fix Database Connection)

**If you're getting database connection errors, follow these steps:**

1. **Create `.env` file in project root:**
   ```env
   # Database Configuration (REQUIRED)
   DB_NAME=awari_projects
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=localhost
   DB_PORT=3306
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   ```

2. **Start MySQL Server:**
   - Windows: Open Services → Start MySQL
   - Mac: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`

3. **Create Database:**
   ```sql
   CREATE DATABASE awari_projects;
   ```

4. **Test Connection:**
   ```bash
   npm run dev
   ```

## 🔧 Installation

1. **Clone the repository**
```bash
   git clone <repository-url>
cd awari_backend
```

2. **Install dependencies**
```bash
npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
```env
   # Server Configuration
PORT=3000
NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=awari_projects
   DB_USER=root
   DB_PASSWORD=your_password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY_ID=your-firebase-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-firebase-client-id
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40project.iam.gserviceaccount.com

   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@awariprojects.com

   # API Configuration
   API_URL=http://localhost:3000
   ```

4. **Set up Firebase Authentication**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Enable Authentication and Google Sign-In provider
   - Go to Project Settings > Service Accounts
   - Generate new private key (downloads JSON file)
   - Copy the following values to your `.env` file:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_PRIVATE_KEY_ID`
     - `FIREBASE_PRIVATE_KEY`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_CLIENT_ID`
     - `FIREBASE_CLIENT_X509_CERT_URL`

5. **Set up database**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE awari_projects;
   ```

6. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

7. **Start the server**
```bash
   # Development mode
npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/api-docs`
- **Health Check**: `http://localhost:8000/api/health`

## 🔐 Authentication Endpoints

### Basic Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Google Sign-In
- `POST /api/auth/google` - Google OAuth2 authentication
- `POST /api/auth/link-google` - Link Google account to existing user
- `POST /api/auth/unlink-google` - Unlink Google account

### Email Verification
- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/resend-verification` - Resend verification email

### Password Management
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

### Account Management
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/request-deletion` - Request account deletion
- `POST /api/auth/confirm-deletion` - Confirm account deletion

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - API request throttling
- **CORS Protection** - Cross-origin resource sharing control
- **Helmet Security** - Security headers middleware
- **Input Validation** - Request data validation
- **SQL Injection Protection** - Sequelize ORM protection

## 📧 Email System

The platform uses a comprehensive email notification system:
- **Email Verification** - Account activation emails
- **Password Reset** - Secure password recovery
- **Account Changes** - Password change confirmations
- **Account Deletion** - Deletion confirmation emails

### Email Templates
- `email-verification.handlebars` - Email verification
- `password-reset.handlebars` - Password reset
- `password-changed.handlebars` - Password change confirmation
- `account-deletion.handlebars` - Account deletion confirmation

## 🗄️ Database Schema

### Core Tables
- **Users** - User accounts and profiles
- **Properties** - Real estate listings
- **Bookings** - Property reservations
- **Payments** - Financial transactions
- **Reviews** - User feedback and ratings
- **Messages** - In-app communication
- **Notifications** - System notifications
- **KYC Documents** - Identity verification
- **Subscriptions** - User subscription plans
- **Favorites** - User property favorites

## 🚀 Development

### Project Structure
```
awari_backend/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── database/         # Database connection
├── middlewares/      # Custom middleware
├── modules/          # Notification modules
├── routes/           # API route definitions
├── schema/           # Database models
├── services/         # Business logic
├── utils/            # Utility functions
├── validations/      # Request validation
├── index.js          # Application entry point
└── package.json      # Dependencies
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

## 🔧 Configuration

### Environment Variables
- **PORT** - Server port (default: 3000)
- **NODE_ENV** - Environment (development/production)
- **DB_*** - Database connection settings
- **JWT_*** - JWT configuration
- **GOOGLE_*** - Google OAuth2 settings
- **SMTP_*** - Email server configuration

### Database Configuration
The platform supports MySQL with the following features:
- Connection pooling
- Automatic reconnection
- Transaction support
- Soft deletes
- Timestamps

## 📱 Client Integration

### Google Sign-In Flow
1. **Client-side**: Implement Firebase Authentication with Google provider
2. **Get ID Token**: Obtain ID token from Firebase Auth
3. **Send to Backend**: POST `/api/auth/google` with `idToken`
4. **Receive JWT**: Backend returns JWT token for authentication

### Example Client Implementation
```javascript
// Initialize Firebase in your client app
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Google Sign-In button click handler
async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    
    // Send to your backend
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    if (data.success) {
      // Store JWT token
      localStorage.setItem('token', data.data.token);
      // Redirect or update UI
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
  }
}
```

## 🚨 Error Handling

The API provides comprehensive error handling:
- **Validation Errors** - 400 Bad Request
- **Authentication Errors** - 401 Unauthorized
- **Authorization Errors** - 403 Forbidden
- **Not Found Errors** - 404 Not Found
- **Conflict Errors** - 409 Conflict
- **Server Errors** - 500 Internal Server Error

## 📊 Monitoring & Logging

- **Request Logging** - Morgan HTTP request logger
- **Error Logging** - Comprehensive error tracking
- **Performance Monitoring** - Response time tracking
- **Health Checks** - System status monitoring

## 🔄 API Versioning

The API follows RESTful principles and includes versioning:
- Current version: v1
- Base URL: `/api/v1`
- Backward compatibility maintained

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@awariprojects.com
- Documentation: `/api-docs` endpoint
- Issues: GitHub Issues page

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] Advanced search and filtering
- [ ] Real-time notifications
- [ ] Mobile app API
- [ ] Payment gateway integration
- [ ] Analytics dashboard
- [ ] Admin panel
- [ ] API rate limiting tiers
- [ ] Webhook system
- [ ] Third-party integrations

---

**Built with ❤️ by the AWARI Projects Team**



