# KHQR Service Implementation - Smart Parking System

**Service Name:** khqr-service  
**Port:** 3003  
**Status:** ✅ IN PROGRESS - Core files created

---

## 📊 Overview

A microservice for handling KHQR (Bakong QR) payments in the Smart Parking System. This service integrates with the Bakong Open API to process parking payments via Cambodia's national QR payment system.

---

## ✅ Files Created

### Configuration Files
- [x] `package.json` - Dependencies and scripts
- [x] `tsconfig.json` - TypeScript configuration
- [x] `.env` - Environment variables
- [x] `.env.example` - Environment template
- [x] `.gitignore` - Git ignore rules

### Database
- [x] `prisma/schema.prisma` - Database schema (2 tables)
  - `khqr_payments` - Payment records
  - `khqr_tokens` - Bakong API token management

### Core Services
- [x] `src/services/bakong.service.ts` - Bakong API integration (all 8 endpoints)
- [x] `src/services/payment.service.ts` - Payment business logic

### Types & Utils
- [x] `src/types/index.ts` - TypeScript type definitions
- [x] `src/utils/response.ts` - Response helpers
- [x] `src/utils/constants.ts` - Constants and error messages
- [x] `src/config/prisma.ts` - Prisma configuration

---

## 🚧 Files Still Needed

### Controllers
- [ ] `src/controllers/payment.controller.ts`
- [ ] `src/controllers/webhook.controller.ts`
- [ ] `src/controllers/token.controller.ts`

### Routes
- [ ] `src/routes/payment.routes.ts`
- [ ] `src/routes/webhook.routes.ts`
- [ ] `src/routes/token.routes.ts`

### Middleware
- [ ] `src/middleware/auth.middleware.ts`
- [ ] `src/middleware/validation.middleware.ts`
- [ ] `src/middleware/error.middleware.ts`

### Validators
- [ ] `src/validators/payment.validator.ts`

### App Setup
- [ ] `src/app.ts` - Express app configuration
- [ ] `src/server.ts` - Server entry point

### Documentation
- [ ] `README.md` - Service documentation

---

## 📋 Database Schema

### khqr_payments Table

```sql
CREATE TABLE "khqr_payments" (
    "payment_id" UUID PRIMARY KEY,
    "booking_id" UUID,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'USD',
    "qr_string" TEXT,
    "deeplink_url" TEXT,
    "transaction_hash" VARCHAR(255) UNIQUE,
    "md5_hash" VARCHAR(32),
    "from_account_id" VARCHAR(100),
    "to_account_id" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'pending',
    "payment_method" VARCHAR(20) DEFAULT 'khqr',
    "description" TEXT,
    "metadata" JSONB,
    "paid_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `user_id`
- `booking_id`
- `status`
- `transaction_hash`
- `created_at`

### khqr_tokens Table

```sql
CREATE TABLE "khqr_tokens" (
    "token_id" UUID PRIMARY KEY,
    "email" VARCHAR(100) UNIQUE,
    "organization" VARCHAR(100),
    "project" VARCHAR(100),
    "token" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "expires_at" TIMESTAMP,
    "last_renewed_at" TIMESTAMP DEFAULT NOW(),
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints (Planned)

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Create new payment |
| GET | `/api/payments/:id` | Get payment details |
| POST | `/api/payments/:id/verify` | Verify payment |
| GET | `/api/payments/user/:userId` | Get user payments |
| GET | `/api/payments/booking/:bookingId` | Get booking payments |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/payment` | Payment callback from Bakong |

### Token Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token/request` | Request KHQR token |
| POST | `/api/token/verify` | Verify token code |
| POST | `/api/token/renew` | Renew expired token |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
PORT=3003
SERVICE_NAME=khqr-service

# Database
DATABASE_URL=postgresql://postgres:12345678@localhost:5432/auth_db

# JWT (shared with auth-service)
JWT_SECRET=9O07i+qCnuBg0HslcMzYsiSDP3tQqsDhtmDYI3h/mo0=
JWT_EXPIRE=7d

# Auth Service
AUTH_SERVICE_URL=http://localhost:3001

# Bakong/KHQR API
KHQR_API_URL=https://api-bakong.nbc.org.kh
KHQR_EMAIL=your-email@company.com
KHQR_ORGANIZATION=Smart Parking System
KHQR_PROJECT=Smart Parking Payment
KHQR_TOKEN=

# App Configuration
APP_NAME=Smart Parking
APP_ICON_URL=https://smartparking.com/logo.png
APP_CALLBACK_URL=http://localhost:8080/payment/callback

# CORS
CORS_ORIGIN=http://localhost:8080,http://localhost:3000
```

---

## 🎯 Implementation Status

### ✅ Completed (60%)
- [x] Project structure created
- [x] Dependencies installed
- [x] Database schema defined
- [x] Prisma client generated
- [x] Bakong API service (all 8 endpoints)
- [x] Payment service (create, verify, get)
- [x] Type definitions
- [x] Utility functions
- [x] Environment configuration

### 🚧 In Progress (40%)
- [ ] Controllers implementation
- [ ] Routes setup
- [ ] Middleware implementation
- [ ] Validators
- [ ] Express app setup
- [ ] Server setup
- [ ] Error handling
- [ ] Documentation

---

## 📦 Dependencies Installed

### Production
- `@prisma/client` - Database ORM
- `axios` - HTTP client for Bakong API
- `express` - Web framework
- `cors` - CORS middleware
- `helmet` - Security headers
- `dotenv` - Environment variables
- `joi` - Validation
- `jsonwebtoken` - JWT handling
- `swagger-jsdoc` - API documentation
- `swagger-ui-express` - API UI
- `uuid` - UUID generation

### Development
- `prisma` - Database toolkit
- `tsx` - TypeScript execution
- `typescript` - TypeScript compiler
- `@types/*` - Type definitions

---

## 🚀 Quick Start (When Complete)

```bash
# 1. Navigate to service
cd services/khqr-service

# 2. Install dependencies (already done)
npm install

# 3. Generate Prisma client (already done)
npx prisma generate

# 4. Run migrations
npx prisma db push

# 5. Start development server
npm run dev
```

---

## 📊 Integration with Other Services

### With Auth Service (Port 3001)
- Verifies user JWT tokens
- Gets user information

### With Parking Service (Port 3002)
- Creates payments for bookings
- Updates booking status after payment

### With Bakong API
- Generates payment QR codes
- Verifies transactions
- Manages API tokens

---

## 🔐 Security Features

1. **JWT Authentication** - Shared secret with auth-service
2. **Token Management** - Secure Bakong token storage
3. **Input Validation** - Joi schema validation
4. **Error Handling** - Structured error responses
5. **CORS** - Configured origin whitelist
6. **Helmet** - Security headers

---

## 📝 Next Steps

### To Complete Implementation:

1. **Create Controllers** (15 min)
   ```bash
   # Create payment controller
   # Create webhook controller
   # Create token controller
   ```

2. **Create Routes** (10 min)
   ```bash
   # Setup payment routes
   # Setup webhook routes
   # Setup token routes
   ```

3. **Create Middleware** (15 min)
   ```bash
   # Auth middleware
   # Validation middleware
   # Error middleware
   ```

4. **Create App & Server** (10 min)
   ```bash
   # Express app setup
   # Server entry point
   ```

5. **Run Migrations** (2 min)
   ```bash
   cd services/khqr-service
   npx prisma db push
   ```

6. **Test Service** (10 min)
   ```bash
   npm run dev
   # Test endpoints with Postman/curl
   ```

**Total estimated time:** ~1 hour

---

## 📖 Usage Examples

### Create Payment

```typescript
POST /api/payments
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "bookingId": "uuid",
  "userId": "uuid",
  "amount": 5.00,
  "currency": "USD",
  "description": "Parking payment for spot A-123"
}

Response:
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "paymentId": "uuid",
    "qrString": "KHQR_...",
    "deeplinkUrl": "https://bakong.page.link/...",
    "amount": 5.00,
    "currency": "USD",
    "status": "pending",
    "createdAt": "2025-10-30T..."
  }
}
```

### Verify Payment

```typescript
POST /api/payments/:id/verify
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "transactionHash": "8465d722d7d5065f..."
}

Response:
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "uuid",
    "status": "paid",
    "transactionData": {
      "hash": "8465d722d7d5065f...",
      "fromAccountId": "user@wing",
      "toAccountId": "smartparking@aba",
      "currency": "USD",
      "amount": 5.00
    },
    "verifiedAt": "2025-10-30T..."
  }
}
```

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
PGPASSWORD=12345678 psql -U postgres -d auth_db -c "\dt"
```

### Bakong API Token Error
```bash
# Request new token
POST /api/token/request
{
  "email": "your@email.com",
  "organization": "Smart Parking",
  "project": "Payment"
}

# Check email and verify
POST /api/token/verify
{
  "code": "CODE_FROM_EMAIL"
}
```

---

## 📚 Related Documentation

- **Bakong Open API Document.pdf** - Official API specification
- **DATABASE_MIGRATION_SUMMARY.md** - Database setup guide
- **Auth Service README** - Auth service documentation
- **Parking Service README** - Parking service documentation

---

**Status:** Core implementation complete, additional files needed for full service  
**Next:** Complete remaining controllers, routes, and middleware  
**ETA:** ~1 hour to full completion
