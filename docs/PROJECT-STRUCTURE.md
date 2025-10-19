# Smart Parking System - Project Structure

## Directory Layout

```
smart-parking-system/
├── services/                           # All microservices
│   ├── auth-service/                   # Authentication & User Management
│   │   ├── prisma/
│   │   │   └── schema.prisma           # Users table only
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── prisma.ts           # Prisma client
│   │   │   │   ├── swagger.ts          # Swagger config
│   │   │   │   └── initDefaultUser.ts  # DB seeding
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts  # Auth endpoints
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts  # JWT verification
│   │   │   │   ├── error.middleware.ts # Error handling
│   │   │   │   └── validation.middleware.ts
│   │   │   ├── models/
│   │   │   │   └── User.model.ts       # User database model
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.ts      # API routes
│   │   │   ├── services/
│   │   │   │   ├── token.service.ts    # JWT generation/verification
│   │   │   │   └── email.service.ts    # Email notifications
│   │   │   ├── types/
│   │   │   │   └── index.ts            # TypeScript types
│   │   │   ├── utils/
│   │   │   │   ├── constants.ts        # App constants
│   │   │   │   ├── logger.ts           # Logging
│   │   │   │   └── response.ts         # Response helpers
│   │   │   ├── validators/
│   │   │   │   └── auth.validator.ts   # Joi schemas
│   │   │   ├── app.ts                  # Express app
│   │   │   └── server.ts               # HTTP server
│   │   ├── .env                        # Environment config
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── parking-service/                # Parking Management
│       ├── prisma/
│       │   └── schema.prisma           # Parking, Booking, Transaction tables
│       ├── src/
│       │   ├── config/
│       │   │   ├── prisma.ts
│       │   │   └── swagger.ts
│       │   ├── controllers/
│       │   │   ├── parking.controller.ts   # Parking spot management
│       │   │   ├── booking.controller.ts   # Booking operations
│       │   │   └── transaction.controller.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts      # Calls auth-service
│       │   │   ├── error.middleware.ts
│       │   │   └── validation.middleware.ts
│       │   ├── models/
│       │   │   ├── ParkingSpot.model.ts
│       │   │   ├── Booking.model.ts
│       │   │   └── Transaction.model.ts
│       │   ├── routes/
│       │   │   ├── parking.routes.ts
│       │   │   ├── booking.routes.ts
│       │   │   └── transaction.routes.ts
│       │   ├── services/
│       │   │   ├── qr.service.ts           # QR code generation
│       │   │   └── authService.client.ts   # HTTP client for auth-service
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   ├── constants.ts
│       │   │   ├── logger.ts
│       │   │   └── response.ts
│       │   ├── validators/
│       │   │   └── booking.validator.ts
│       │   ├── app.ts
│       │   └── server.ts
│       ├── .env
│       ├── .env.example
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── aggregator/                         # API Gateway
│   ├── app.ts                          # Request routing, Swagger aggregation
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                               # Documentation
│   ├── MICROSERVICES-ARCHITECTURE.md   # Detailed architecture guide
│   ├── MIGRATION-SUMMARY.md            # What changed in refactoring
│   └── PROJECT-STRUCTURE.md            # This file
│
├── shared/                             # Shared utilities (future use)
│
├── .git/                               # Git repository
├── .gitignore
├── package.json                        # Root package.json
├── package-lock.json
└── README.md                           # Main README
```

## File Counts

```bash
# Count TypeScript files in each service
services/auth-service/src:      ~18 files
services/parking-service/src:   ~20 files
aggregator:                      1 file
Total:                          ~40 TypeScript files
```

## Key Directories

### `/services/auth-service/`
**Purpose:** Authentication and user management
**Port:** 3001
**Database:** Users table
**Responsibilities:**
- User registration/login
- JWT token generation
- Email verification
- Password reset
- User profile management

### `/services/parking-service/`
**Purpose:** Parking and booking management
**Port:** 3002
**Database:** Parking spots, bookings, transactions
**Responsibilities:**
- Parking spot CRUD
- Booking creation/management
- Transaction tracking
- QR code generation
- Calls auth-service for user data

### `/aggregator/`
**Purpose:** API Gateway
**Port:** 3000
**Database:** None (stateless)
**Responsibilities:**
- Route requests to services
- Merge Swagger documentation
- Single entry point for clients

### `/docs/`
**Purpose:** Project documentation
**Contents:**
- Architecture guides
- Migration documentation
- API documentation
- Setup instructions

## Configuration Files

### Service-Level
Each service has:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables
- `prisma/schema.prisma` - Database schema
- `README.md` - Service-specific docs

### Root-Level
- `package.json` - Root dependencies (aggregator, shared tools)
- `.gitignore` - Git ignore rules
- `README.md` - Main project documentation

## Navigation Guide

### To work on authentication:
```bash
cd services/auth-service
npm run dev
```

### To work on parking features:
```bash
cd services/parking-service
npm run dev
```

### To run the API Gateway:
```bash
cd aggregator
npm start
```

### To view documentation:
```bash
# Open in browser or editor
docs/MICROSERVICES-ARCHITECTURE.md
docs/MIGRATION-SUMMARY.md
```

## Service Dependencies

```
auth-service:
├── @prisma/client
├── bcrypt
├── cors
├── dotenv
├── express
├── helmet
├── joi
├── jsonwebtoken
├── nodemailer
├── swagger-jsdoc
├── swagger-ui-express
└── uuid

parking-service:
├── @prisma/client
├── axios              # For calling auth-service
├── cors
├── dotenv
├── express
├── helmet
├── joi
├── jsonwebtoken
├── qrcode
├── swagger-jsdoc
├── swagger-ui-express
└── uuid

aggregator:
├── axios              # For proxying requests
├── express
├── lodash             # For merging Swagger specs
└── swagger-ui-express
```

## Database Structure

### Auth Service Database
```sql
-- Tables owned by auth-service
users (user_id, first_name, last_name, email, ...)
```

### Parking Service Database
```sql
-- Tables owned by parking-service
parking_spots (spot_id, level, section, ...)
bookings (booking_id, user_id, spot_id, ...)  -- user_id references auth-service
transactions (transaction_id, booking_id, user_id, ...)
```

**Important:** `user_id` in parking-service is just a string reference, NOT a foreign key to auth-service database.

## Environment Variables

### services/auth-service/.env
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
PORT=3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

### services/parking-service/.env
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret      # Must match auth-service
AUTH_SERVICE_URL=http://localhost:3001
PORT=3002
```

### aggregator/.env (optional)
```env
AUTH_SERVICE_URL=http://localhost:3001
PARKING_SERVICE_URL=http://localhost:3002
PORT=3000
```

## Communication Flow

### Client Request Flow
```
Client
  ↓
API Gateway (3000)
  ↓
├─ /api/v1/auth/*     → Auth Service (3001)
├─ /api/v1/users/*    → Auth Service (3001)
├─ /api/v1/parking/*  → Parking Service (3002)
├─ /api/v1/bookings/* → Parking Service (3002)
└─ /api/v1/transactions/* → Parking Service (3002)
```

### Inter-Service Communication
```
Parking Service
  ↓ (HTTP)
AuthServiceClient
  ↓ (HTTP)
Auth Service
  ↓
Returns user data / token verification
```

## Build Outputs

Each service builds to a `dist/` directory:
```
services/auth-service/dist/
services/parking-service/dist/
```

## Git Structure

```
.git/
.gitignore  # Ignores:
            # - node_modules/
            # - .env
            # - dist/
            # - *.log
```

## Testing

### Unit Tests (future)
```
services/auth-service/tests/
services/parking-service/tests/
```

### Integration Tests (future)
```
tests/integration/
├── auth.test.ts
├── parking.test.ts
└── gateway.test.ts
```

## Deployment Structure

```
Production Environment:

Server 1: services/auth-service/     (+ PostgreSQL for users)
Server 2: services/parking-service/  (+ PostgreSQL for parking)
Server 3: aggregator/                (stateless, can scale)
```

Each service can be:
- Containerized with Docker
- Deployed to separate servers
- Scaled independently
- Updated without affecting others

## Summary

**Total Services:** 3 (auth, parking, gateway)
**Total Databases:** 2 (auth DB, parking DB)
**Total Endpoints:** 25+
**Architecture:** True Microservices ✅
**Language:** TypeScript 100%

This structure follows microservices best practices with:
- Clear service boundaries
- Database per service
- HTTP communication
- Independent deployment
- Single responsibility principle
