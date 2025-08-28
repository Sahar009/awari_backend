# AWARI Projects - Database Models

This directory contains all the Sequelize models for the AWARI Projects real estate platform.

## Models Overview

### Core Models

- **User** - User accounts with different roles (renter, buyer, landlord, agent, hotel_provider, admin)
- **KycDocument** - KYC verification documents for users
- **Property** - Real estate listings (rent, sale, shortlet)
- **PropertyMedia** - Images, videos, and documents for properties
- **Booking** - Property bookings and inspections
- **Review** - User reviews and ratings
- **Payment** - Payment transactions and payouts
- **Message** - User communication system
- **Notification** - User notifications and alerts
- **Subscription** - Landlord/agent subscription plans
- **Favorite** - User favorite properties

## Usage

### Import Models

```javascript
// Import individual models
import { User, Property, Booking } from './modules/index.js';

// Or import all models
import models from './modules/index.js';
const { User, Property } = models;
```

### Basic CRUD Operations

```javascript
// Create a new user
const user = await User.create({
  email: 'user@example.com',
  passwordHash: 'hashedPassword',
  firstName: 'John',
  lastName: 'Doe',
  role: 'renter'
});

// Find user with properties
const userWithProperties = await User.findByPk(userId, {
  include: [
    { model: Property, as: 'ownedProperties' },
    { model: Booking, as: 'userBookings' }
  ]
});

// Create a property
const property = await Property.create({
  ownerId: userId,
  title: 'Beautiful 3-bedroom apartment',
  description: 'Spacious apartment in prime location',
  propertyType: 'apartment',
  listingType: 'rent',
  price: 150000.00,
  address: '123 Main Street',
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria'
});

// Find properties with filters
const properties = await Property.findAll({
  where: {
    city: 'Lagos',
    listingType: 'rent',
    status: 'active'
  },
  include: [
    { model: User, as: 'owner' },
    { model: PropertyMedia, as: 'media' }
  ]
});
```

### Relationships

The models include comprehensive relationships:

```javascript
// User -> Properties (as owner)
const userProperties = await user.getOwnedProperties();

// Property -> Media
const propertyMedia = await property.getMedia();

// Property -> Bookings
const propertyBookings = await property.getBookings({
  include: [{ model: User, as: 'user' }]
});

// User -> Favorites
const userFavorites = await user.getFavorites({
  include: [{ model: Property, as: 'property' }]
});
```

### Validation

All models include comprehensive validation:

```javascript
// User validation
const user = await User.create({
  email: 'invalid-email', // Will fail validation
  firstName: '', // Will fail validation
  role: 'invalid_role' // Will fail validation
});

// Property validation
const property = await Property.create({
  price: -100, // Will fail validation
  bedrooms: -1 // Will fail validation
});
```

### Hooks

The User model includes password hashing hooks:

```javascript
// Password is automatically hashed on create/update
const user = await User.create({
  email: 'user@example.com',
  passwordHash: 'plainTextPassword', // Automatically hashed
  firstName: 'John',
  lastName: 'Doe'
});

// Compare password
const isValid = await user.comparePassword('plainTextPassword');
```

## Database Schema

The models are designed to work with PostgreSQL and include:

- UUID primary keys
- Proper foreign key relationships
- Comprehensive validation rules
- JSON fields for flexible data storage
- Timestamps (createdAt, updatedAt)
- Proper indexing for performance

## Migration

To create the database tables, use Sequelize migrations:

```bash
# Generate migration
npx sequelize-cli migration:generate --name create-users-table

# Run migrations
npm run migrate

# Undo migrations
npm run migrate:undo
```

## Notes

- All models use snake_case for database columns and camelCase for JavaScript properties
- UUIDs are used for all primary and foreign keys
- Comprehensive validation ensures data integrity
- Models include proper associations for complex queries
- JSON fields allow for flexible data storage without schema changes
