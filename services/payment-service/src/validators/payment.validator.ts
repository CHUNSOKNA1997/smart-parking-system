import Joi from "joi";

/**
 * Validation schema for creating a new payment
 */
export const createPaymentSchema = Joi.object({
    bookingId: Joi.string().uuid().required().messages({
        "string.empty": "Booking ID is required",
        "string.guid": "Booking ID must be a valid UUID",
    }),

    amount: Joi.number()
        .positive()
        .min(0.01)
        .max(100000)
        .precision(2)
        .required()
        .messages({
            "number.base": "Amount must be a number",
            "number.positive": "Amount must be positive",
            "number.min": "Amount must be at least $0.01",
            "number.max": "Amount cannot exceed $100,000",
            "any.required": "Amount is required",
        }),

    currency: Joi.string().valid("USD", "KHR").default("USD").messages({
        "string.base": "Currency must be a string",
        "any.only": "Currency must be either USD or KHR",
    }),

    description: Joi.string().max(500).optional().messages({
        "string.max": "Description cannot exceed 500 characters",
    }),
});

/**
 * Validation schema for payment ID parameter
 */
export const paymentIdSchema = Joi.object({
    paymentId: Joi.string().uuid().required().messages({
        "string.empty": "Payment ID is required",
        "string.guid": "Payment ID must be a valid UUID",
    }),
});

/**
 * Validation schema for user ID parameter
 */
export const userIdSchema = Joi.object({
    userId: Joi.string().uuid().required().messages({
        "string.empty": "User ID is required",
        "string.guid": "User ID must be a valid UUID",
    }),
});

/**
 * Validation schema for booking ID parameter
 */
export const bookingIdSchema = Joi.object({
    bookingId: Joi.string().uuid().required().messages({
        "string.empty": "Booking ID is required",
        "string.guid": "Booking ID must be a valid UUID",
    }),
});
