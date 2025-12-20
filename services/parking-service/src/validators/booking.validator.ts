import Joi from "joi";
import { BookingStatus } from "@prisma/client";

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

    paymentMethod: Joi.string().valid("aba", "khqr").optional().messages({
        "any.only": "Payment method must be either 'aba' or 'khqr'",
    }),

    currency: Joi.string().valid("USD", "KHR").optional().messages({
        "any.only": "Currency must be either 'USD' or 'KHR'",
    }),
});

// Update booking status validation
export const updateBookingStatusSchema = Joi.object({
    status: Joi.string()
        .valid(...Object.values(BookingStatus))
        .required()
        .messages({
            "any.only": `Status must be one of: ${Object.values(BookingStatus).join(", ")}`,
            "any.required": "Status is required",
        }),
});
