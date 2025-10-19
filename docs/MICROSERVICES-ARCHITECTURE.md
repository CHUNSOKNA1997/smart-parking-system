# Smart Parking System - Microservices Architecture

## Overview

This project follows **true microservices architecture** with separate services, databases, and inter-service HTTP communication.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    API Gateway (Port 3000)               │
│            Single Entry Point for All Requests          │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────────┐   ┌────────▼──────────────┐
│  Auth Service      │   │  Parking Service      │
│  (Port 3001)       │   │  (Port 3002)          │
├────────────────────┤   ├───────────────────────┤
│ Owns:              │   │ Owns:                 │
│ - Users            │   │ - Parking Spots       │
│ - Authentication   │   │ - Bookings            │
│ - JWT Tokens       │   │ - Transactions        │
├────────────────────┤   ├───────────────────────┤
│ Database:          │   │ Database:             │
│ - users table      │   │ - parking_spots       │
│                    │   │ - bookings            │
│                    │   │ - transactions        │
│                    │   │ - userId (reference)  │
└────────────────────┘   └────────────────────────┘
                              │
                              │ HTTP API Call
                              ▼
                    ┌─────────────────────┐
                    │ AuthServiceClient   │
                    │ - verifyToken()     │
                    │ - getUserById()     │
                    └─────────────────────┘
```

## Key Microservices Principles

### 1. **Database per Service**
- ✅ **auth-service**: Owns `users` table
- ✅ **parking-service**: Owns `parking_spots`, `bookings`, `transactions`
- ✅ No foreign keys across services
- ✅ `userId` stored as string reference (not FK relation)

### 2. **Service-to-Service Communication**
- ✅ HTTP/REST APIs (no direct database access)
- ✅ AuthServiceClient with retry logic
- ✅ Exponential backoff for failed requests
- ✅ Timeout handling (5 seconds)

### 3. **Independent Deployment**
- ✅ Each service can be deployed separately
- ✅ Each service has its own `package.json`
- ✅ Each service runs on different ports

### 4. **Single Responsibility**
- ✅ auth-service: Authentication, user management
- ✅ parking-service: Parking operations, bookings

## Service Details

### Auth Service (Port 3001)

**Responsibilities:**
- User registration and login
- JWT token generation and verification
- Email verification
- Password reset
- User profile management

**API Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/verify-email/:token
POST   /api/v1/auth/resend-verification
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/user               (protected)
POST   /api/v1/auth/verify-token       (for microservices)
GET    /api/v1/auth/users/:userId      (for microservices)
```

**Database Schema:**
```prisma
model User {
  id                String
  firstName         String
  lastName          String
  email             String @unique
  passwordHash      String
  phone             String?
  isVerified        Boolean
  verificationToken String?
  resetToken        String?
  resetTokenExpiry  DateTime?
  createdAt         DateTime
  updatedAt         DateTime
}
```

### Parking Service (Port 3002)

**Responsibilities:**
- Parking spot management
- Booking creation and management
- Transaction tracking
- QR code generation

**API Endpoints:**
```
GET    /api/v1/parking/spots
GET    /api/v1/parking/spots/available
GET    /api/v1/parking/spots/type/:type
GET    /api/v1/parking/spots/:spotId
GET    /api/v1/parking/statistics

POST   /api/v1/bookings                (protected)
GET    /api/v1/bookings/user           (protected)
GET    /api/v1/bookings/active         (protected)
GET    /api/v1/bookings/:bookingId     (protected)
PATCH  /api/v1/bookings/:bookingId/status
POST   /api/v1/bookings/:bookingId/cancel
POST   /api/v1/bookings/:bookingId/complete

GET    /api/v1/transactions/user       (protected)
GET    /api/v1/transactions/summary    (protected)
GET    /api/v1/transactions/:transactionId
```

**Database Schema:**
```prisma
model ParkingSpot {
  id           String
  level        Int
  section      String
  spotType     String
  isAvailable  Boolean
  pricePerHour Decimal
  lastUpdated  DateTime
  createdAt    DateTime
}

model Booking {
  id            String
  userId        String    // Reference to auth-service User
  spotId        String
  startTime     DateTime
  endTime       DateTime?
  durationHours Decimal?
  totalPrice    Decimal?
  status        String
  qrCode        String?
  createdAt     DateTime
  updatedAt     DateTime
}

model Transaction {
  id              String
  bookingId       String?
  userId          String  // Reference to auth-service User
  amount          Decimal
  paymentMethod   String
  status          String
  description     String?
  transactionDate DateTime
}
```

### API Gateway (Port 3000)

**Responsibilities:**
- Route requests to appropriate services
- Merge Swagger documentation
- Single entry point for clients

**Routing Rules:**
```
/api/v1/auth/*         → auth-service:3001
/api/v1/users/*        → auth-service:3001
/api/v1/parking/*      → parking-service:3002
/api/v1/bookings/*     → parking-service:3002
/api/v1/transactions/* → parking-service:3002
```

**Features:**
- Request proxying
- Error handling
- Service unavailability handling (503)
- Merged Swagger UI at `/api-docs`

## Inter-Service Communication

### AuthServiceClient

**Location:** `services/parking-service/src/services/authService.client.ts`

**Features:**
- ✅ HTTP client to auth-service
- ✅ Retry logic with exponential backoff (3 retries)
- ✅ 5-second timeout
- ✅ Error handling for network failures

**Methods:**
```typescript
// Verify JWT token
async verifyToken(token: string): Promise<TokenVerifyResponse>

// Get user details
async getUserById(userId: string): Promise<UserData | null>

// Health check
async healthCheck(): Promise<boolean>
```

**Retry Strategy:**
- Max retries: 3
- Base delay: 1 second
- Exponential backoff: 1s, 2s, 3s
- Only retries on network errors or 5xx errors

### JWT Token Payload

**Enhanced with User Info:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Benefits:**
- Reduces calls to auth-service
- User info available from token
- Only fetch full profile when needed

## Authentication Flow

### 1. User Login
```
Client → API Gateway → Auth Service
                        ↓
                   Generate JWT (with user info)
                        ↓
Client ← API Gateway ← Auth Service (returns token)
```

### 2. Booking Creation (Protected)
```
Client → API Gateway → Parking Service
                           ↓
                   Extract token from header
                           ↓
                   AuthServiceClient.verifyToken()
                           ↓
                   Auth Service verifies token
                           ↓
                   Returns user info {userId, email, firstName, lastName}
                           ↓
Client ← API Gateway ← Create booking with userId
```

## Setup Instructions

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install auth-service dependencies
cd services/auth-service
npm install
npm run prisma:generate

# Install parking-service dependencies
cd ../parking-service
npm install
npm run prisma:generate

# Install aggregator dependencies
cd ../../aggregator
npm install
```

### 2. Configure Environment Variables

**services/auth-service/.env:**
```env
DATABASE_URL=postgresql://user:password@host:5432/auth_db
JWT_SECRET=your_jwt_secret
PORT=3001
```

**services/parking-service/.env:**
```env
DATABASE_URL=postgresql://user:password@host:5432/parking_db
JWT_SECRET=your_jwt_secret  # Must match auth-service
AUTH_SERVICE_URL=http://localhost:3001
PORT=3002
```

**aggregator/.env (optional):**
```env
AUTH_SERVICE_URL=http://localhost:3001
PARKING_SERVICE_URL=http://localhost:3002
PORT=3000
```

### 3. Run Services

**Option A: Run separately**
```bash
# Terminal 1 - Auth Service
cd services/auth-service
npm run dev

# Terminal 2 - Parking Service
cd services/parking-service
npm run dev

# Terminal 3 - API Gateway
cd aggregator
npm start
```

**Option B: Use concurrently (recommended)**
```bash
# From root directory
npm run dev:all
```

### 4. Test the Services

**Health Checks:**
```bash
curl http://localhost:3000/health
curl http://localhost:3001/api/v1/auth/user  # Returns 401 (expected)
curl http://localhost:3002/api/v1/parking/spots
```

**API Documentation:**
```
http://localhost:3000/api-docs
```

## Benefits of This Architecture

### ✅ **Independence**
- Services can be developed independently
- Different teams can own different services
- Deploy services separately

### ✅ **Scalability**
- Scale auth-service independently (e.g., 3 instances)
- Scale parking-service based on load
- Horizontal scaling per service

### ✅ **Resilience**
- Retry logic handles temporary failures
- Service degradation (parking works even if user profile fails)
- Circuit breaker pattern ready

### ✅ **Maintainability**
- Clear service boundaries
- Single responsibility per service
- Easier to test and debug

### ✅ **Technology Flexibility**
- Each service can use different tech (if needed)
- Database optimized per service needs
- Independent upgrades

## Migration from Shared Database

**What Changed:**

1. ✅ Removed cross-service relations in Prisma schemas
2. ✅ Removed User model from parking-service
3. ✅ Added AuthServiceClient for HTTP communication
4. ✅ Updated middleware to verify tokens via HTTP
5. ✅ Enhanced JWT with user information
6. ✅ Created API Gateway for routing
7. ✅ Removed UserController from parking-service

**What Stayed the Same:**

- ✅ Same database server (Supabase)
- ✅ Same authentication flow for clients
- ✅ Same API endpoints (clients don't notice change)
- ✅ Same JWT secret (backward compatible)

## Monitoring and Debugging

### Service Health
```bash
# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3000/health
```

### Logs
- Each service logs independently
- Check console output for errors
- AuthServiceClient logs retry attempts

### Common Issues

**Issue:** "Auth service unavailable"
**Solution:** Ensure auth-service is running on port 3001

**Issue:** "Token verification failed"
**Solution:** Check JWT_SECRET matches in both services

**Issue:** 503 Service Unavailable
**Solution:** Service is down or unreachable, check network/ports

## Next Steps / Future Improvements

### Recommended Enhancements:

1. **Message Queue** - Add RabbitMQ/Kafka for async communication
2. **Service Discovery** - Use Consul or Eureka
3. **Circuit Breaker** - Implement full circuit breaker pattern
4. **API Rate Limiting** - Add rate limiting per service
5. **Distributed Tracing** - Add Jaeger or Zipkin
6. **Centralized Logging** - ELK stack or Grafana Loki
7. **Service Mesh** - Consider Istio for production
8. **Event Sourcing** - Track user changes as events
9. **CQRS** - Separate read/write databases

## Conclusion

Your Smart Parking System now follows **true microservices architecture** with:
- ✅ Database per service
- ✅ HTTP-based service communication
- ✅ Independent deployment
- ✅ API Gateway pattern
- ✅ Retry and error handling
- ✅ No caching (by design for simplicity)

This architecture is production-ready and scalable!
