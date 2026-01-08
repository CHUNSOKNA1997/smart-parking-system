/**
 * PayWay Validation Schemas
 *
 * These schemas validate incoming requests using Joi library.
 * If validation fails, user gets clear error message.
 *
 * WHY VALIDATION?
 * - Prevent invalid data from reaching controller
 * - Provide clear error messages to mobile app
 * - Security: Reject malicious input early
 * - Data consistency: Ensure data is in correct format
 */

import Joi from "joi";

/**
 * Validation schema for generating QR code
 *
 * POST /api/v1/payments/payway/qr
 *
 * VALIDATES:
 * - bookingId: Required, must be valid UUID
 * - amount: Required, must be positive number (0.01 to 100,000)
 * - currency: Required, must be "USD" or "KHR"
 * - description: Optional, max 500 characters
 *
 * EXAMPLE VALID REQUEST:
 * {
 *   "bookingId": "abc-123-def-456",
 *   "amount": 5.00,
 *   "currency": "USD",
 *   "description": "Parking Spot A1"
 * }
 *
 * EXAMPLE INVALID REQUEST:
 * {
 *   "bookingId": "invalid",  // ❌ Not a valid UUID
 *   "amount": -5.00,         // ❌ Negative amount
 *   "currency": "EUR"        // ❌ Not USD or KHR
 * }
 */
export const generateQRSchema = Joi.object({
    bookingId: Joi.string().uuid().required().messages({
        "string.empty": "Booking ID is required",
        "string.guid": "Booking ID must be a valid UUID",
        "any.required": "Booking ID is required",
    }),

    amount: Joi.number()
        .positive()
        .min(0.01)
        .max(100000)
        .precision(2)
        .optional() // Optional: will fetch from booking service
        .messages({
            "number.base": "Amount must be a number",
            "number.positive": "Amount must be positive",
            "number.min": "Amount must be at least $0.01",
            "number.max": "Amount cannot exceed $100,000",
        }),

    currency: Joi.string().valid("USD", "KHR").optional().messages({
        "string.base": "Currency must be a string",
        "any.only": "Currency must be either USD or KHR",
    }),

    description: Joi.string().max(500).optional().messages({
        "string.max": "Description cannot exceed 500 characters",
    }),
});

/**
 * Validation schema for payment ID parameter
 *
 * GET /api/v1/payments/:paymentId/status
 *
 * VALIDATES:
 * - paymentId: Required, must be valid UUID
 *
 * EXAMPLE VALID:
 * GET /api/v1/payments/abc-123-def-456/status  ✅
 *
 * EXAMPLE INVALID:
 * GET /api/v1/payments/invalid-id/status       ❌
 */
export const paymentIdSchema = Joi.object({
    paymentId: Joi.string().uuid().required().messages({
        "string.empty": "Payment ID is required",
        "string.guid": "Payment ID must be a valid UUID",
        "any.required": "Payment ID is required",
    }),
});

/**
 * Validation schema for booking ID parameter
 *
 * Used for various booking-related endpoints
 */
export const bookingIdSchema = Joi.object({
    bookingId: Joi.string().uuid().required().messages({
        "string.empty": "Booking ID is required",
        "string.guid": "Booking ID must be a valid UUID",
        "any.required": "Booking ID is required",
    }),
});
