# Parking Service

Parking management microservice for Smart Parking System.

## Features

- Parking spot management
- Booking system with QR codes
- Transaction tracking
- User profile management
- Real-time availability

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure `.env`:
   - Set DATABASE_URL (Supabase)
   - Set JWT_SECRET (must match auth-service)

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run in development:
```bash
npm run dev
```

## API Endpoints

### Parking Spots (Public)
- `GET /api/v1/parking/spots` - Get all spots
- `GET /api/v1/parking/spots/available` - Get available spots
- `GET /api/v1/parking/spots/type/:type` - Get spots by type (car/motorcycle)
- `GET /api/v1/parking/spots/:spotId` - Get specific spot
- `GET /api/v1/parking/statistics` - Get parking statistics

### Bookings (Protected)
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/user` - Get user bookings
- `GET /api/v1/bookings/active` - Get active booking
- `GET /api/v1/bookings/:bookingId` - Get specific booking
- `PATCH /api/v1/bookings/:bookingId/status` - Update booking status
- `POST /api/v1/bookings/:bookingId/cancel` - Cancel booking
- `POST /api/v1/bookings/:bookingId/complete` - Complete booking

### Transactions (Protected)
- `GET /api/v1/transactions/user` - Get user transactions
- `GET /api/v1/transactions/summary` - Get transaction summary
- `GET /api/v1/transactions/:transactionId` - Get specific transaction

### Users (Protected)
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile

## Authentication

All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Get token from Auth Service login endpoint.

## Port

Default: 3002
