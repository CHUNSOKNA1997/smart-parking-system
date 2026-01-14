import Joi from "joi";

// Create booking validation schema
export const createBookingSchema = Joi.object({
    spotId: Joi.string().required().messages({
        "string.empty": "Spot ID is required",
    }),

    startTime: Joi.date().iso().messages({
        "date.format": "Start time must be a valid ISO date",
    }),

    endTime: Joi.date().iso().min(Joi.ref("startTime")).messages({
        "date.format": "End time must be a valid ISO date",
        "date.min": "End time must be after start time",
    }),

    durationHours: Joi.number().min(0.5).max(24).messages({
        "number.min": "Duration must be at least 0.5 hours",
        "number.max": "Duration cannot exceed 24 hours",
    }),

    paymentMethod: Joi.string().valid("aba", "khqr", "payway").optional().messages({
        "any.only": "Payment method must be one of: 'aba', 'khqr', or 'payway'",
    }),

    currency: Joi.string().valid("USD", "KHR").optional().messages({
        "any.only": "Currency must be either 'USD' or 'KHR'",
    }),
});
