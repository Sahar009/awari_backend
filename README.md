# Awari 

## Overview
Awari is multi-role dashboards, payments, bookings, property listings,

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQL and Sequelize ORM
- **Authentication**: JWT, bcrypt
- **File Storage**: Cloudinary
- **Email Service**: Nodemailer with Handlebars
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest (coming soon...)

## Core Features
- **User Management**
  - Authentication & Authorization
  - Role-based access control
  - Email verification
  - Password recovery
- **File Management**
  - Image upload and optimization
  - Secure file storage
  - Multiple file format support
- **Security**
  - HTTP headers protection (Helmet)
  - CORS configuration
  - Rate limiting
  - Input validation
- **Monitoring**
  - Request logging
  - Error tracking
  - Performance monitoring
- **API Documentation**
  - Interactive Swagger UI
  - API versioning
  - Request/Response examples

## Project Structure
```
Awari_backend/
├── config/                 # Configuration files
│   ├── config.js          # App configuration
│   └── swagger.js         # API documentation config
├── controllers/           # Request handlers
├── middlewares/          # Custom middleware functions
├── models/               # Database models
├── modules/              # Reusable modules
│   ├── helpers/         # Utility functions
│   ├── storage/         # File storage handlers
│   └── views/           # Email templates
├── routes/              # API route definitions
├── services/            # Business logic
├── tests/              # Test files
├── .env                # Environment variables
├── .env.example        # Environment template
└── index.js            # Application entry point
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/awari_backend
cd awari_backend
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Environment Setup**

```bash
cp .env.example .env
```

Configure your `.env` file with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
# DB_NAME=db_name
# DB_USER=db_user
# DB_PASSWORD=db_password
# DB_HOST=db_host
# DB_PORT=3306


# Authentication
JWT_SECRET=your_secure_secret
JWT_EXPIRES_IN=24h

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
```

4. **Start Development Server**

```bash
npm run dev
# or
yarn dev
```

### Available Scripts
- `npm run dev`: Start development server with hot-reload
- `npm start`: Start production server
- `npm test`: Run test suite
- `npm run lint`: Check code style
- `npm run build`: Build for production

## API Documentation
- Development: `http://localhost:3000/api-docs`
- Production: `https://your-domain.com/api-docs`

### API Versioning
All endpoints are prefixed with `/api/v1/`

### Authentication

```bash
# Bearer Token
Authorization: Bearer <your_jwt_token>
```

## Error Handling
The API uses conventional HTTP response codes:
- `2xx`: Success
- `4xx`: Client errors
- `5xx`: Server errors

## Development

### Code Style
- ESLint configuration
- Prettier for formatting
- Husky for pre-commit hooks

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-name`

## Deployment
1. Build the application

```bash
npm run build
```

2. Set production environment variables
3. Start the server

```bash
npm start
```

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support
- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Email: support@nagida.com

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors
- Your Name - Initial work - [GitHub Profile]

## Acknowledgments
- Express.js community
-JS Community
- All contributors

---


Made with ❤️ by Dev Sahar...



