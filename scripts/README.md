# Backend Scripts

This directory contains utility scripts for managing the backend database and creating test accounts.

## Available Scripts

### createDemoUser.js

Creates a demo test user account for development and testing purposes.

**Usage:**
```bash
# Using npm script
npm run create-demo-user

# Or directly with node
node scripts/createDemoUser.js
```

**Demo Account Credentials:**
- **Email:** `devuser@mail.com`
- **Password:** `Dev123456@`
- **Role:** `agent`
- **Status:** `active`
- **Email Verified:** `true`
- **Profile Completed:** `true`

**Features:**
- Creates a new demo user if one doesn't exist
- Updates existing user if email already exists
- Restores soft-deleted users if found
- Sets user to active status with verified email
- Uses proper password hashing

**Output:**
The script will display:
- Database connection status
- User creation/update status
- User details (ID, email, name, role, status)
- Login credentials

### createAdminUser.js

Creates or updates an admin user account.

**Usage:**
```bash
node scripts/createAdminUser.js
```

**Configuration:**
Set environment variables in `.env`:
- `ADMIN_EMAIL` (default: `admin@awari.com`)
- `ADMIN_PASSWORD` (default: `admin123@`)

### create-tables.js

Creates database tables if they don't exist.

**Usage:**
```bash
npm run create-tables
```

## Notes

- All scripts require a valid database connection configured in `.env`
- Scripts automatically close database connections when finished
- Scripts handle errors gracefully and provide clear error messages


