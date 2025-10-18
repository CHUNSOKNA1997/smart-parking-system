# Auth Service

Authentication microservice for Smart Parking System.

## Features

- User registration with email verification
- Login with JWT authentication
- Email verification
- Password reset
- Token management
- Protected routes

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
   - Set database credentials (Supabase)
   - Set JWT secret
   - Set Gmail SMTP credentials

4. Run in development:
```bash
npm run dev
```

5. Run in production:
```bash
npm start
```

## API Endpoints

### POST /api/auth/register
Register a new user

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

### POST /api/auth/login
Login user

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

### GET /api/auth/verify-email/:token
Verify email address

### POST /api/auth/resend-verification
Resend verification email

### POST /api/auth/forgot-password
Request password reset

### POST /api/auth/reset-password
Reset password with token

### GET /api/auth/me (Protected)
Get current user info

### POST /api/auth/verify-token
Verify JWT token (for other microservices)

## Gmail Setup for Email

1. Enable 2-Factor Authentication on Gmail
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
3. Use the generated password in `.env` as `EMAIL_PASSWORD`

## Port

Default: 3001
