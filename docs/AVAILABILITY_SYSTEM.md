# Property Availability Management System

This document explains how to use the property availability management system that allows users to block/unblock dates for properties and ensures date pickers in the frontend can access this information.

## Overview

The availability system consists of:
1. **PropertyAvailability Schema** - Tracks unavailable dates for properties
2. **Availability Service** - Business logic for managing availability
3. **API Endpoints** - RESTful endpoints for frontend integration
4. **Booking Integration** - Automatic date blocking/unblocking for bookings

## Database Schema

### PropertyAvailability Table

```sql
CREATE TABLE property_availability (
  id UUID PRIMARY KEY DEFAULT UUIDV4(),
  propertyId UUID NOT NULL REFERENCES properties(id),
  date DATE NOT NULL,
  reason ENUM('booking', 'maintenance', 'owner_blocked', 'admin_blocked', 'unavailable') NOT NULL,
  bookingId UUID NULL REFERENCES bookings(id),
  notes TEXT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdBy UUID NULL REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_property_date (propertyId, date),
  INDEX idx_property_active (propertyId, isActive),
  INDEX idx_date (date)
);
```

## API Endpoints

### 1. Get Availability Calendar
**GET** `/api/availability/calendar/{propertyId}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Returns a calendar view with available/unavailable dates for a property.

**Response:**
```json
{
  "success": true,
  "data": {
    "property": {
      "id": "uuid",
      "title": "Property Title",
      "minStayNights": 1,
      "maxStayNights": 30,
      "instantBooking": true
    },
    "calendar": [
      {
        "date": "2024-01-15",
        "available": true,
        "reason": null,
        "notes": null,
        "bookingId": null
      },
      {
        "date": "2024-01-16",
        "available": false,
        "reason": "booking",
        "notes": "Blocked for booking abc-123",
        "bookingId": "booking-uuid"
      }
    ]
  }
}
```

### 2. Get Unavailable Dates
**GET** `/api/availability/unavailable/{propertyId}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Returns only the unavailable dates for a property.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-16",
      "reason": "booking",
      "notes": "Blocked for booking abc-123",
      "bookingId": "booking-uuid"
    }
  ]
}
```

### 3. Get Available Dates
**GET** `/api/availability/available/{propertyId}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Returns only the available dates for a property.

**Response:**
```json
{
  "success": true,
  "data": ["2024-01-15", "2024-01-17", "2024-01-18"]
}
```

### 4. Check Date Range Availability
**POST** `/api/availability/check/{propertyId}`

Check if a specific date range is available for booking.

**Request Body:**
```json
{
  "checkInDate": "2024-01-15",
  "checkOutDate": "2024-01-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": false,
    "conflictingDates": [
      {
        "date": "2024-01-16",
        "reason": "booking",
        "notes": "Blocked for booking abc-123"
      }
    ],
    "totalNights": 5
  }
}
```

### 5. Block a Date (Owner/Admin Only)
**POST** `/api/availability/block/{propertyId}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "date": "2024-01-20",
  "reason": "maintenance",
  "notes": "Property maintenance scheduled"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Date blocked successfully",
  "data": {
    "id": "availability-uuid",
    "propertyId": "property-uuid",
    "date": "2024-01-20",
    "reason": "maintenance",
    "notes": "Property maintenance scheduled",
    "isActive": true,
    "createdBy": "user-uuid"
  }
}
```

### 6. Unblock a Date (Owner/Admin Only)
**DELETE** `/api/availability/unblock/{propertyId}?date=YYYY-MM-DD`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Date unblocked successfully"
}
```

### 7. Block Multiple Dates (Owner/Admin Only)
**POST** `/api/availability/block-multiple/{propertyId}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "dates": ["2024-01-20", "2024-01-21", "2024-01-22"],
  "reason": "maintenance",
  "notes": "Property maintenance scheduled"
}
```

### 8. Unblock Multiple Dates (Owner/Admin Only)
**DELETE** `/api/availability/unblock-multiple/{propertyId}`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "dates": ["2024-01-20", "2024-01-21", "2024-01-22"]
}
```

### 9. Get Availability Records (Owner/Admin Only)
**GET** `/api/availability/records/{propertyId}?page=1&limit=20&reason=booking&startDate=2024-01-01&endDate=2024-12-31&includeInactive=false`

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "availability-uuid",
        "propertyId": "property-uuid",
        "date": "2024-01-16",
        "reason": "booking",
        "bookingId": "booking-uuid",
        "notes": "Blocked for booking abc-123",
        "isActive": true,
        "createdBy": "user-uuid",
        "booking": {
          "id": "booking-uuid",
          "status": "confirmed",
          "checkInDate": "2024-01-16",
          "checkOutDate": "2024-01-18"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Frontend Integration

### Date Picker Implementation

For date pickers in the frontend, you can use the availability endpoints to:

1. **Get available dates** for a property within a date range
2. **Disable unavailable dates** in the date picker
3. **Show reasons** for blocked dates (optional)

#### Example Frontend Usage

```javascript
// Get available dates for a property
const getAvailableDates = async (propertyId, startDate, endDate) => {
  const response = await fetch(
    `/api/availability/available/${propertyId}?startDate=${startDate}&endDate=${endDate}`
  );
  const data = await response.json();
  return data.data; // Array of available date strings
};

// Get calendar data for more detailed information
const getAvailabilityCalendar = async (propertyId, startDate, endDate) => {
  const response = await fetch(
    `/api/availability/calendar/${propertyId}?startDate=${startDate}&endDate=${endDate}`
  );
  const data = await response.json();
  return data.data.calendar; // Array of date objects with availability info
};

// Check if a specific date range is available before booking
const checkAvailability = async (propertyId, checkInDate, checkOutDate) => {
  const response = await fetch(`/api/availability/check/${propertyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkInDate,
      checkOutDate
    })
  });
  const data = await response.json();
  return data.data; // { available: boolean, conflictingDates: array }
};
```

#### React Date Picker Example

```jsx
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';

const PropertyDatePicker = ({ propertyId, onDateSelect }) => {
  const [availableDates, setAvailableDates] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 3); // Next 3 months

      const calendar = await getAvailabilityCalendar(
        propertyId,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      const available = calendar.filter(day => day.available).map(day => new Date(day.date));
      const unavailable = calendar.filter(day => !day.available).map(day => new Date(day.date));

      setAvailableDates(available);
      setUnavailableDates(unavailable);
    };

    fetchAvailability();
  }, [propertyId]);

  const isDateAvailable = (date) => {
    return availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  return (
    <div>
      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        selectsStart
        startDate={startDate}
        endDate={endDate}
        filterDate={isDateAvailable}
        placeholderText="Check-in date"
        minDate={new Date()}
      />
      <DatePicker
        selected={endDate}
        onChange={(date) => setEndDate(date)}
        selectsEnd
        startDate={startDate}
        endDate={endDate}
        filterDate={isDateAvailable}
        placeholderText="Check-out date"
        minDate={startDate}
      />
    </div>
  );
};
```

## Automatic Booking Integration

The system automatically handles date blocking/unblocking when bookings are:

1. **Confirmed** - Dates are automatically blocked
2. **Cancelled** - Dates are automatically unblocked

This happens in the `bookingService.js` and doesn't require any additional frontend integration.

## Availability Reasons

The system supports different reasons for blocking dates:

- **`booking`** - Automatically set when a booking is confirmed
- **`maintenance`** - Property maintenance or repairs
- **`owner_blocked`** - Property owner manually blocked the date
- **`admin_blocked`** - Admin manually blocked the date
- **`unavailable`** - General unavailability

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters, invalid data)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (property doesn't exist)
- `409` - Conflict (date already blocked)
- `500` - Internal server error

## Performance Considerations

1. **Database Indexes** - The system includes optimized indexes for fast queries
2. **Pagination** - Availability records endpoint supports pagination
3. **Caching** - Consider implementing Redis caching for frequently accessed availability data
4. **Date Range Limits** - Consider implementing reasonable limits on date range queries

## Security

1. **Authentication Required** - All blocking/unblocking operations require authentication
2. **Authorization** - Property owners can only manage their own properties
3. **Input Validation** - All date inputs are validated
4. **SQL Injection Protection** - Using Sequelize ORM with parameterized queries

## Migration and Setup

The availability system will be automatically created when the database is synchronized. No manual migration is required.

To test the system:

1. Create a property
2. Use the availability endpoints to block/unblock dates
3. Create a booking and confirm it (dates will be automatically blocked)
4. Cancel the booking (dates will be automatically unblocked)
