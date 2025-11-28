# KHQR "Account Not Found" Error - Fix Documentation

**Issue:** When scanning the generated KHQR code with another bank app, the error message "The account number is not found" appeared.

**Date Fixed:** 2025-11-15

---

## Root Cause

The `KHQR_MERCHANT_ID` environment variable was set to `ee12623cdeac4a1c`, which was extracted from the JWT token payload. However, this value is **not** a valid Bakong merchant ID.

For **personal Bakong accounts** (like `sokna_chun@pinc`), the merchant ID field should be **left empty**. Only registered merchants who have obtained a merchant ID from NBC Bakong need to provide this value.

---

## Solution

### 1. Updated `.env` Configuration

Changed from:
```env
KHQR_MERCHANT_ID=ee12623cdeac4a1c  # ❌ Incorrect
KHQR_ACCOUNT_ID=sokna_chun@pinc
```

To:
```env
KHQR_MERCHANT_ID=                   # ✅ Empty for personal accounts
KHQR_ACCOUNT_ID=sokna_chun@pinc
```

### 2. Updated KHQR Generator Logic

**File:** `src/services/khqr-generator.service.ts`

Updated the `buildMerchantInfo()` method to:
- Only include merchant ID (Tag 01) if it's provided and not empty
- Always include account ID (Tag 02) as it's required
- Maintain EMVCo tag ordering (00, 01, 02)

**Code change:**
```typescript
private buildMerchantInfo(): string {
    let merchantInfo = "";

    // Global Unique Identifier (Tag 00)
    merchantInfo += this.buildTag("00", "kh.gov.nbc.bakong");

    // Merchant ID (Tag 01) - Only for registered merchants
    if (this.config.merchantId && this.config.merchantId.trim() !== "") {
        merchantInfo += this.buildTag("01", this.config.merchantId);
    }

    // Account ID (Tag 02) - Required for all accounts
    merchantInfo += this.buildTag("02", this.config.accountId);

    return merchantInfo;
}
```

### 3. Updated Validation

Updated `validateConfig()` to reflect that `KHQR_MERCHANT_ID` is **optional**:

```typescript
validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Account ID is required
    if (!this.config.accountId) {
        errors.push("KHQR_ACCOUNT_ID is not configured (required)");
    }

    // Merchant Name is required
    if (!this.config.merchantName) {
        errors.push("KHQR_MERCHANT_NAME is not configured (required)");
    }

    // Merchant ID is optional (only needed for registered merchants)

    return { valid: errors.length === 0, errors };
}
```

---

## Account Types

### Personal Bakong Account

**Format:** `username@bank` (e.g., `sokna_chun@pinc`)

**Configuration:**
```env
KHQR_MERCHANT_ID=                   # Leave empty
KHQR_ACCOUNT_ID=username@bank       # Required
KHQR_MERCHANT_NAME=Your Name/Business
```

### Registered Merchant Account

**Format:** Merchant ID from NBC Bakong

**Configuration:**
```env
KHQR_MERCHANT_ID=actual_merchant_id # From NBC Bakong
KHQR_ACCOUNT_ID=username@bank       # Required
KHQR_MERCHANT_NAME=Business Name
```

---

## How to Test

1. **Restart the payment service:**
   ```bash
   cd services/payment-service
   npm run dev
   ```

2. **Generate a new QR code:**
   ```bash
   curl -X POST http://localhost:3003/api/v1/payments \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "bookingId": "test-booking",
       "amount": 5.00,
       "currency": "USD",
       "description": "Test payment"
     }'
   ```

3. **Scan the QR code** with any Bakong-compatible banking app (ABA, ACLEDA, etc.)

4. **Expected result:** The app should now recognize the account and show the payment details correctly.

---

## Technical Details

### EMVCo KHQR Tag Structure

The QR code contains Tag-Length-Value (TLV) formatted data:

**Tag 29** - Merchant Account Information:
- **Tag 00:** Global Unique Identifier = "kh.gov.nbc.bakong"
- **Tag 01:** Merchant ID (optional for personal accounts)
- **Tag 02:** Account ID (required)

**Before (incorrect):**
```
29XX 0019kh.gov.nbc.bakong 0116ee12623cdeac4a1c 0216sokna_chun@pinc
     [Tag 00]               [Tag 01 - wrong ID]  [Tag 02]
```

**After (correct):**
```
29XX 0019kh.gov.nbc.bakong 0216sokna_chun@pinc
     [Tag 00]               [Tag 02 only]
```

---

## References

- [Bakong KHQR Specification](https://bakong.nbc.gov.kh/)
- [EMVCo QR Code Specification](https://www.emvco.com/emv-technologies/qrcodes/)
- Bakong API Documentation (SIT environment)

---

## Status

✅ **FIXED** - QR codes now work correctly with personal Bakong accounts.

The generated QR codes can be scanned by any Bakong-compatible banking app without the "account not found" error.
