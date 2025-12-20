# Password Reset Flow Guide

This document outlines the secure 3-step process for resetting a forgotten password in the Smart Parking System.

## Overview

The flow consists of three distinct API calls:
1. **Request OTP** (`POST /request`): User enters email, system sends a 6-digit code.
2. **Verify OTP** (`POST /verify`): User enters the code to prove identity.
3. **Reset Password** (`POST /reset`): User sets a new password.

---

## Step 1: Request Password Reset

User clicks "Forgot Password?" and enters their email address.

- **Endpoint:** `POST /api/v1/auth/password/reset/request`
- **Action:** System generates a 6-digit OTP and sends it via **Email** (using SMTP/Nodemailer).
- **Security:** If the email doesn't exist, the system still returns a "success" message ("Password reset code sent...") to prevent user enumeration attacks.

### Request
```json
{
  "email": "user@example.com"
}
```

### Response
```json
{
  "success": true,
  "message": "Password reset code sent to your email"
}
```

---

## Step 2: Verify OTP

User enters the 6-digit code received in their email.

- **Endpoint:** `POST /api/v1/auth/password/reset/verify`
- **Action:** Validates that the OTP matches the email and hasn't expired (usually valid for 5-10 minutes).

### Request
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Response
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password.",
  "data": {
    "email": "user@example.com"
  }
}
```

---

## Step 3: Set New Password

User enters their new password.

- **Endpoint:** `POST /api/v1/auth/password/reset`
- **Action:** Updates the user's password in the database (hashed) and clears the OTP.
- **Prerequisite:** The OTP must have been verified in the previous step.

### Request
```json
{
  "email": "user@example.com",
  "newPassword": "newSecurePassword123!"
}
```

### Response
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

---

## Mobile Implementation Flow (Kotlin)

### Screen 1: Input Email
```kotlin
// Call Request API
apiService.requestPasswordReset(RequestPasswordResetRequest(email))
// On Success: Navigate to OTP Screen
```

### Screen 2: Input OTP
```kotlin
// Call Verify API
apiService.verifyResetOtp(VerifyResetOtpRequest(email, otp))
// On Success: Navigate to New Password Screen
```

### Screen 3: Input New Password
```kotlin
// Call Reset API
apiService.resetPassword(ResetPasswordRequest(email, newPassword))
// On Success: Navigate to Login Screen
```

---

## Email Configuration

The OTP is sent to the user's email address. The backend uses `Nodemailer` with SMTP settings defined in `.env`:

- `SMTP_HOST`: The email server host (e.g., smtp.gmail.com)
- `SMTP_USER`: The sender email address
- `SMTP_PASS`: The sender email password or app-specific password

**Where to find the code:**
- Service: `services/auth-service/src/services/email.service.ts`
- Controller: `services/auth-service/src/controllers/auth.controller.ts`
