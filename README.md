# Smart Parking System Backend - Quick Start

This is the backend for the Smart Parking System, built with Microservices (Auth, Payment, Parking + Gateway).

## 🚀 How to Start

### 1. Install Dependencies
You need to install dependencies for **EACH** service. Run these commands in separate terminals or sequentially:

```bash
# Root (for utility scripts)
npm install

# Auth Service
cd services/auth-service
npm install

# Parking Service
cd ../parking-service
npm install

# Payment Service
cd ../payment-service
npm install

# Aggregator (Gateway)
cd ../../aggregator
npm install
```

### 2. Environment Setup (.env)
Create a `.env` file in each service directory if they don't exist.

**`services/auth-service/.env`**
```env
PORT=3001
# Update with your DB credentials
DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db?schema=public"
JWT_SECRET="super-secret-key"
```

**`services/parking-service/.env`**
```env
PORT=3002
DATABASE_URL="postgresql://postgres:password@localhost:5432/parking_db?schema=public"
JWT_SECRET="super-secret-key"
AUTH_SERVICE_URL="http://localhost:3001"
```

**`services/payment-service/.env`**
```env
PORT=3003
DATABASE_URL="postgresql://postgres:password@localhost:5432/payment_db?schema=public"
JWT_SECRET="super-secret-key"
# KHQR / Bakong Config (if needed)
BAKONG_ACCESS_TOKEN=your_token
KHQR_MERCHANT_ID=your_id
```

### 3. Run Everything
We have a script to run all services at once!

```bash
# In the root directory
npm run dev
```

This will start:
- **Gateway** on `http://localhost:3000`
- **Auth Service** on Port `3001`
- **Parking Service** on Port `3002`
- **Payment Service** on Port `3003`

### 4. Database Setup (First Time Only)
If you haven't set up the databases yet, run migration for each service:

```bash
cd services/auth-service && npx prisma migrate dev --name init
cd ../parking-service && npx prisma migrate dev --name init
cd ../payment-service && npx prisma migrate dev --name init
```

## 📡 API Endpoints

- **Main API**: `http://localhost:3000/api/v1`
- **Docs**: `http://localhost:3000/api-docs` (Swagger UI)

## 🛑 Stop Services
Press `Ctrl+C` in the terminal to stop all services.
