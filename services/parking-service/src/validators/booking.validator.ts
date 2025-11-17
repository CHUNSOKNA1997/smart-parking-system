import Joi from "joi";
import { BookingStatus } from "@prisma/client";

// Create booking validation schema
export const createBookingSchema = Joi.object({
	spotId: Joi.string().required().messages({
		"string.empty": "Spot ID is required",
	}),

	durationHours: Joi.number().min(0.5).max(24).required().messages({
		"number.min": "Duration must be at least 0.5 hours",
		"number.max": "Duration cannot exceed 24 hours",
		"any.required": "Duration is required",
	}),
});

// Update booking status validation
export const updateBookingStatusSchema = Joi.object({
	status: Joi.string()
		.valid(...Object.values(BookingStatus))
		.required()
		.messages({
			"any.only":
				`Status must be one of: ${Object.values(BookingStatus).join(", ")}`,
			"any.required": "Status is required",
		}),
});
