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
