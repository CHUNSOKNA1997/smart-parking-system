# Bakong Access Token Renewal Guide

**Issue:** `Unauthorized, not yet requested for token or code invalid`

This error means your Bakong API access token has expired or is invalid.

---

## Understanding Bakong Tokens

- **Validity:** Bakong access tokens expire after **90 days**
- **Purpose:** Required for authenticated API calls (checking transactions, verifying accounts)
- **Location:** Stored in `.env` as `BAKONG_ACCESS_TOKEN`

---

## Solution: Renew Your Token

### Option 1: Renew Existing Registration (Recommended)

If you already registered with Bakong API before:

#### Step 1: Add Your Email to .env

Add this line to your `.env` file:
```env
BAKONG_REGISTRATION_EMAIL=the_email_you_used_to_register@example.com
```

#### Step 2: Request Renewal

```bash
cd services/payment-service
npx tsx renew-bakong-token.ts
```

This will send a verification code to your email.

#### Step 3: Verify and Get New Token

```bash
npx tsx verify-bakong-token.ts
```

Enter the code from your email when prompted.

#### Step 4: Update .env

Copy the new token and update your `.env` file:
```env
BAKONG_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW_TOKEN_HERE...
```

#### Step 5: Restart Service

```bash
npm run dev
```

---

### Option 2: New Registration

If you don't have the original email or this is your first time:

#### Step 1: Edit Registration Script

Open `request-bakong-token.ts` and update:
```typescript
const registrationData = {
    email: "your_actual_email@example.com",  // Your email
    organization: "Smart Parking System",     // Your org name
    project: "Parking Payment Service"        // Your project name
};
```

#### Step 2: Request Token

```bash
npx tsx request-bakong-token.ts
```

#### Step 3: Verify Email

Check your email for the verification code, then:
```bash
npx tsx verify-bakong-token.ts
```

#### Step 4: Update .env

Update your `.env` with the new token.

---

## What If I Can't Get a Token?

### Workaround: Disable Transaction Verification Temporarily

If you can't get a Bakong token right now, you can still:
- ✅ Generate QR codes (doesn't require token)
- ✅ Show QR codes to users
- ✅ Users can scan and pay

But you **cannot**:
- ❌ Automatically verify payments via API
- ❌ Check transaction status programmatically
- ❌ Verify account information

### Manual Payment Verification

Without a token, you can:
1. User scans QR and pays
2. User takes a screenshot of payment confirmation
3. Admin manually verifies the payment in bank app
4. Admin manually updates payment status in database

---

## Testing Without Real Payments

For development/testing, you can:

### Option A: Mock the Bakong Service

Create a mock service that doesn't require a real token:

```typescript
// For testing only - don't use in production
class MockBakongService {
    async checkTransactionByMD5(request: any) {
        return {
            responseCode: 0,
            data: {
                hash: "mock_hash",
                amount: 5.00,
                currency: "USD",
                fromAccountId: "test@aba",
                toAccountId: process.env.KHQR_ACCOUNT_ID,
                createdDateMs: Date.now(),
                acknowledgedDateMs: Date.now()
            }
        };
    }
}
```

### Option B: Skip Token Validation in Dev Mode

Add to your `.env`:
```env
NODE_ENV=development
SKIP_BAKONG_AUTH=true  # For testing only
```

Then update the service to skip auth in dev mode.

---

## Checking Token Expiry

Your current token expires on approximately:
```
Issued: Based on JWT payload "iat": 1761811748
Expires: 90 days later
```

To decode your current token:
```bash
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiZWUxMjYyM2NkZWFjNGExYyJ9LCJpYXQiOjE3NjE4MTE3NDgsImV4cCI6MTc2OTU4Nzc0OH0.KgLQXmxCG4GB-28OLXZHKLvPimDFzavWckj3Ow2ge94" | cut -d. -f2 | base64 -d
```

---

## Important Notes

1. **Keep tokens secure** - Don't commit to Git
2. **Set expiry reminders** - Tokens expire every 90 days
3. **Have backup email** - Make sure you can access the registration email
4. **Test token renewal** - Try renewing before it expires

---

## Quick Reference

| Script | Purpose |
|--------|---------|
| `request-bakong-token.ts` | First-time registration |
| `renew-bakong-token.ts` | Renew expired token |
| `verify-bakong-token.ts` | Verify email code and get token |

---

## Error Messages Explained

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized, not yet requested for token or code invalid" | Token expired or invalid | Renew token |
| "CloudFront blocking" | IP/request blocked | Wait or change network |
| "Transaction not found" | Payment not completed yet | User hasn't paid yet (normal) |

---

## Status

⚠️ **Action Required:** Renew your Bakong access token to restore API functionality.

Current status:
- ✅ QR code generation: Working
- ❌ Transaction verification: Requires token renewal
- ❌ Account checking: Requires token renewal
