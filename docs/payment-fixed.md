# Payment & Booking Flow - Issues Fixed & Remaining Work

## Date: 2026-01-02

## Issues Fixed

### 1. Two-Step Flow Implementation (Bakong/KHQR Only)
**Status**: ✅ Implemented
- Removed server-side payment initiation from `parking-service/booking.controller.ts`
- Booking now creates RESERVED status only; client calls `POST /api/v1/payments` separately
- Client performs polling via `GET /api/v1/payments/{id}` with exponential backoff (2s initial, max 8s, 40 attempts)
- Added `PaymentApiService.getPayment()` and `PaymentRepository.getPaymentStatus()` for polling
- Removed ABA PayWay intent/deeplink auto-open logic; KHQR-only flow shows QR screen

### 2. Price Mismatch Between App and QR Code
**Status**: ✅ Fixed
**Root Cause**: Frontend used hardcoded `ratePerHour = 5.0`; backend spot A1-004 had `pricePerHour = 1.0`
**Fix Applied**:
- Added `pricePerHour` field to `ParkingSpot` UI model
- HomeViewModel now maps `apiSpot.pricePerHour` from backend response
- BookingPaymentScreen and CompleteBookingScreen use `selectedSpot.pricePerHour` instead of hardcoded value

### 3. Currency Conversion Mismatch
**Status**: ✅ Fixed
**Root Cause**: Client did local conversion (display only), but passed original USD amount with KHR currency tag → payment service encoded USD amount as KHR in QR
**Fix Applied**:
- Added `currency` column to `bookings` table (VARCHAR(3), default "USD") via Prisma migration `20260102080522_add_currency_to_bookings`
- `booking.controller.ts` now converts `totalPrice` server-side when `currency="KHR"` (exchange rate: 4100 USD→KHR)
- Removed client-side conversion logic from `BookingPaymentScreen` (line 196 `total * exchangeRate`)
- Client now passes selected currency to `createBooking(currency=selected)` → server converts and returns booking with correct `totalPrice` + `currency` → client uses exact values for `createPayment`

### 4. Payment Service Idempotency (md5 Unique Constraint Error)
**Status**: ✅ Fixed
**Root Cause**: Duplicate payment requests with same QR string caused Prisma P2002 error (unique constraint on `md5_hash`)
**Fix Applied**:
- Added `findUnique(md5Hash)` check before create in `payment.service.ts`
- Wrapped create in try/catch to handle race conditions; returns existing payment if P2002 occurs

### 5. QR Image Generation & Endpoint
**Status**: ✅ Implemented
- `POST /api/v1/payments` now generates and returns `qrImage` (base64 data URL) in response
- Added `GET /api/v1/payments/:id/qr-image` endpoint returning `image/png` (generated from stored `qrString`)
- Updated `CreatePaymentResponse` type to include optional `qrImage` field
- Client `Payment` model updated with `qrImage: String?` field

### 6. Deeplink vs QR Display Logic
**Status**: ✅ Fixed
- Removed auto-open deeplink for KHQR; app now always shows QR screen when `bookingPaymentMethod == "khqr"`
- Removed ABA-specific `isPackageInstalled` and auto-confirm-on-resume for KHQR
- Polling triggered when user taps "I have paid" button

## Remaining Issues / Future Work

### 1. QR Code Branding (KHQR Logo Overlay)
**Status**: ⚠️ Pending
**Requirement**: Follow KHQR Card Guideline PDF and use official KHQR_Logo.png
**Current**: Basic QR code generated; no logo overlay or KHQR-compliant styling
**Action Needed**:
- Server-side: Composite KHQR logo into center of PNG using image processing library (sharp or canvas)
- Reference: `/home/pc-kira/.../payment-service/KHQR Card Guideline.pdf` and `KHQR_Logo.png`
- Implement in `khqr-generator.service.ts` or create dedicated QR image composer

### 2. Bakong Configuration (Empty Credentials)
**Status**: ⚠️ Incomplete
**Current `.env` Issues**:
```
BAKONG_ACCESS_TOKEN=""           # Empty - deeplink generation fails silently
APP_DEEPLINK_CALLBACK=""         # Empty - no callback URL for Bakong mobile apps
KHQR_MERCHANT_ID/ACCOUNT_ID      # Using test/placeholder values
```
**Action Needed**:
- Obtain real Bakong merchant credentials or use sandbox/test account
- Set `BAKONG_ACCESS_TOKEN` if deeplink generation is required (currently warning-only)
- Populate `APP_DEEPLINK_CALLBACK` if app needs to handle return from Bakong mobile app

### 3. Booking Expiration & Timeout Handling
**Status**: ⚠️ Partially Implemented
**Current**: Payment has `expiresAt` field; booking stays RESERVED until payment completes or manual cancel
**Issues**:
- No automatic booking cancellation if payment expires (RESERVED spots remain locked)
- Client polling timeout (40 attempts × backoff = ~3-5 min) but no server-side cleanup
**Action Needed**:
- Implement booking expiration job (cron/scheduler) to auto-cancel RESERVED bookings after QR expiry
- Release parking spot when booking expires
- Client should handle polling timeout gracefully (show retry/cancel options)

### 4. Webhook vs Polling (Payment Confirmation)
**Status**: ⚠️ Client-only Polling
**Current**: Client polls `GET /api/v1/payments/{id}`; ABA webhook exists but not used for KHQR
**Future Enhancement**:
- Implement Bakong webhook if NBC provides callback mechanism
- Fallback to polling if webhook fails (current approach is safe but less efficient)

### 5. Error Handling & User Feedback
**Status**: ⚠️ Needs Improvement
**Issues**:
- Toast notifications not consistently shown (frontend issue flagged by user)
- Payment failures (401 Unauthorized, 500 errors) cause silent rollback with generic "Failed to initiate payment" message
- No detailed error messages for KHQR config validation failures
**Action Needed**:
- Audit toast/snackbar usage in Kotlin app (ModernToast component)
- Improve backend error responses (structured error codes + user-friendly messages)
- Add logging/sentry for payment failures

### 6. Multi-Currency Support Refinement
**Status**: ⚠️ Basic Implementation
**Current**: Server converts USD→KHR (fixed rate 4100); client allows currency selector
**Limitations**:
- Hardcoded exchange rate (no live rate API)
- No support for currency beyond USD/KHR
- No currency validation on backend (accepts any string)
**Action Needed**:
- Add currency enum validation in `booking.validator.ts`
- Consider live exchange rate service or admin-configurable rates
- Document default currency behavior (USD is parking spot base price)

### 7. Transaction Record Sync
**Status**: ⚠️ Incomplete
**Current**: `parking-service` creates transaction record on booking; `payment-service` manages KHQR payment separately
**Issue**: No automatic link between transaction record and payment confirmation
**Action Needed**:
- Update transaction status when payment completes (via webhook or client-triggered endpoint)
- Implement `POST /api/v1/bookings/{id}/confirm-payment` properly (currently exists but may not be called in KHQR-only flow)

## Testing Checklist

- [ ] End-to-end booking → KHQR payment → polling → confirmation with USD
- [ ] End-to-end booking → KHQR payment → polling → confirmation with KHR
- [ ] Price consistency: app display = QR encoded amount = booking.totalPrice
- [ ] Currency consistency: app currency selector = booking.currency = payment.currency = QR currency tag
- [ ] Idempotency: duplicate payment requests return existing payment (no P2002 error)
- [ ] Polling timeout handling (max attempts reached, show retry option)
- [ ] Payment expiration (QR expires, booking auto-cancels, spot released)
- [ ] Error cases: invalid spot, unauthorized, payment-service down, database errors

## Files Modified (Reference)

### Backend
- `services/parking-service/src/controllers/booking.controller.ts` - Removed payment initiation, added currency conversion
- `services/parking-service/prisma/schema.prisma` - Added `currency` field to Booking model
- `services/payment-service/src/services/payment.service.ts` - Added md5 idempotency, qrImage generation
- `services/payment-service/src/controllers/payment.controller.ts` - Added `getPaymentQrImage` method
- `services/payment-service/src/routes/payment.routes.ts` - Added `GET /:id/qr-image` route
- `services/payment-service/src/types/index.ts` - Added optional `qrImage` to `CreatePaymentResponse`

### Frontend (Kotlin)
- `app/.../features/home/data/ParkingSpot.kt` - Added `pricePerHour` field
- `app/.../features/home/presentation/viewmodel/HomeViewModel.kt` - Two-step flow, polling with backoff, map pricePerHour
- `app/.../features/home/presentation/view/HomeScreen.kt` - Updated to use spot.pricePerHour, removed deeplink auto-open for KHQR
- `app/.../features/payment/data/model/PaymentModels.kt` - Added `qrImage: String?` to Payment model
- `app/.../features/payment/data/remote/PaymentApiService.kt` - Added `GET /payments/{id}` endpoint
- `app/.../features/payment/domain/repository/IPaymentRepository.kt` - Added `getPaymentStatus(paymentId)` method
- `app/.../features/payment/data/repository/PaymentRepository.kt` - Implemented `getPaymentStatus`
- `app/.../ui/screens/booking/BookingPaymentScreen.kt` - Removed client-side currency conversion

## Notes
- KHQR_CURRENCY in `.env` is "USD" (merchant default); client can request KHR and server converts
- Payment-service auth requires valid JWT (Authorization: Bearer <token>); ensure app includes token
- For debugging, use `curl` with JWT or check service logs for detailed error messages
