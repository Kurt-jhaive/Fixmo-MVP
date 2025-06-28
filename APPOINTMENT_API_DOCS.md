# Appointment API Documentation

## Base URL
`/api/appointments`

## Authentication
All endpoints require authentication. Include the Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Get All Appointments
**GET** `/api/appointments`

Get all appointments with filtering and pagination support.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by appointment status
- `provider_id` (optional): Filter by provider ID
- `customer_id` (optional): Filter by customer ID
- `from_date` (optional): Filter appointments from this date
- `to_date` (optional): Filter appointments until this date
- `sort_by` (optional): Sort field (default: 'scheduled_date')
- `sort_order` (optional): Sort order 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "appointment_status": "pending",
      "scheduled_date": "2025-06-28T10:00:00.000Z",
      "actual_price": 150.00,
      "repairDescription": "Fix broken sink",
      "created_at": "2025-06-27T08:00:00.000Z",
      "customer": {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "1234567890",
        "user_location": "Manila"
      },
      "serviceProvider": {
        "provider_id": 1,
        "provider_first_name": "Jane",
        "provider_last_name": "Smith",
        "provider_email": "jane@example.com",
        "provider_phone_number": "0987654321",
        "provider_location": "Manila",
        "provider_rating": 4.5
      },
      "appointment_rating": []
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 50,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

### 2. Get Appointment by ID
**GET** `/api/appointments/:appointmentId`

Get detailed information about a specific appointment.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "appointment_status": "pending",
    "scheduled_date": "2025-06-28T10:00:00.000Z",
    "actual_price": 150.00,
    "repairDescription": "Fix broken sink",
    "created_at": "2025-06-27T08:00:00.000Z",
    "customer": {
      "user_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone_number": "1234567890",
      "user_location": "Manila",
      "profile_photo": "/uploads/profiles/customer1.jpg"
    },
    "serviceProvider": {
      "provider_id": 1,
      "provider_first_name": "Jane",
      "provider_last_name": "Smith",
      "provider_email": "jane@example.com",
      "provider_phone_number": "0987654321",
      "provider_location": "Manila",
      "provider_profile_photo": "/uploads/profiles/provider1.jpg",
      "provider_rating": 4.5
    },
    "appointment_rating": []
  }
}
```

### 3. Create New Appointment
**POST** `/api/appointments`

Create a new appointment.

**Request Body:**
```json
{
  "customer_id": 1,
  "provider_id": 1,
  "scheduled_date": "2025-06-28T10:00:00.000Z",
  "appointment_status": "pending",
  "actual_price": 150.00,
  "repairDescription": "Fix broken sink"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "appointment_id": 1,
    "customer_id": 1,
    "provider_id": 1,
    "appointment_status": "pending",
    "scheduled_date": "2025-06-28T10:00:00.000Z",
    "actual_price": 150.00,
    "repairDescription": "Fix broken sink",
    "created_at": "2025-06-27T08:00:00.000Z",
    "customer": {...},
    "serviceProvider": {...}
  }
}
```

### 4. Update Appointment
**PUT** `/api/appointments/:appointmentId`

Update an existing appointment.

**Request Body:**
```json
{
  "scheduled_date": "2025-06-28T14:00:00.000Z",
  "appointment_status": "confirmed",
  "actual_price": 200.00,
  "repairDescription": "Fix broken sink and replace faucet"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment updated successfully",
  "data": {
    // Updated appointment data
  }
}
```

### 5. Delete Appointment
**DELETE** `/api/appointments/:appointmentId`

Delete an appointment and its associated ratings.

**Response:**
```json
{
  "success": true,
  "message": "Appointment deleted successfully"
}
```

### 6. Update Appointment Status
**PATCH** `/api/appointments/:appointmentId/status`

Update only the appointment status.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Valid Status Values:**
- `pending`
- `confirmed`
- `in-progress`
- `completed`
- `cancelled`
- `no-show`

**Response:**
```json
{
  "success": true,
  "message": "Appointment status updated to confirmed",
  "data": {
    // Updated appointment data
  }
}
```

### 7. Reschedule Appointment
**PATCH** `/api/appointments/:appointmentId/reschedule`

Reschedule an appointment to a new date and time.

**Request Body:**
```json
{
  "new_scheduled_date": "2025-06-29T10:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully",
  "data": {
    // Updated appointment data with new scheduled date
  }
}
```

### 8. Get Provider Appointments
**GET** `/api/appointments/provider/:providerId`

Get all appointments for a specific service provider.

**Query Parameters:**
- `status` (optional): Filter by appointment status
- `from_date` (optional): Filter appointments from this date
- `to_date` (optional): Filter appointments until this date
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_order` (optional): Sort order 'asc' or 'desc' (default: 'desc')

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "appointment_id": 1,
      "customer_id": 1,
      "provider_id": 1,
      "appointment_status": "pending",
      "scheduled_date": "2025-06-28T10:00:00.000Z",
      "actual_price": 150.00,
      "repairDescription": "Fix broken sink",
      "created_at": "2025-06-27T08:00:00.000Z",
      "customer": {
        "user_id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone_number": "1234567890",
        "user_location": "Manila",
        "profile_photo": "/uploads/profiles/customer1.jpg"
      },
      "appointment_rating": []
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 25,
    "limit": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

### 9. Get Customer Appointments
**GET** `/api/appointments/customer/:customerId`

Get all appointments for a specific customer.

**Query Parameters:** (Same as provider appointments)

**Response:** (Similar structure to provider appointments but with serviceProvider data instead of customer data)

### 10. Get Appointment Statistics
**GET** `/api/appointments/stats`

Get comprehensive appointment statistics.

**Query Parameters:**
- `provider_id` (optional): Get stats for specific provider

**Response:**
```json
{
  "success": true,
  "data": {
    "total_appointments": 150,
    "pending_appointments": 25,
    "confirmed_appointments": 40,
    "completed_appointments": 70,
    "cancelled_appointments": 15,
    "monthly_appointments": 30,
    "yearly_appointments": 150,
    "total_revenue": 15000.00,
    "average_rating": 4.2,
    "completion_rate": 85
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development)"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (access denied)
- `404`: Not found
- `409`: Conflict (scheduling conflict)
- `500`: Internal server error

## Features

### Conflict Prevention
- Prevents double booking for providers at the same time
- Validates scheduled dates are in the future
- Checks provider availability before booking

### Data Validation
- Validates required fields
- Checks data formats (dates, numbers)
- Validates appointment status values
- Ensures customer and provider exist

### Comprehensive Filtering
- Filter by status, date ranges, provider, customer
- Pagination support for all list endpoints
- Sorting options

### Rich Data Inclusion
- Includes customer and provider information
- Includes appointment ratings
- Profile photos and contact information

### Statistics and Analytics
- Total appointments and revenue
- Status breakdown
- Monthly and yearly statistics
- Average ratings and completion rates
