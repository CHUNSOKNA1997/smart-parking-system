import express from "express";
import BookingController from "../controllers/booking.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
	createBookingSchema,
	updateBookingStatusSchema,
} from "../validators/booking.validator.js";

const router = express.Router();

// All booking routes require authentication
// Create new booking
router.post(
	"/",
	authenticateToken,
	validate(createBookingSchema),
	BookingController.createBooking
);

// Get current user's bookings
router.get("/me", authenticateToken, BookingController.getUserBookings);

// Get current user's active booking
router.get("/me/active", authenticateToken, BookingController.getActiveBooking);

// Get specific booking by ID
router.get("/:bookingId", authenticateToken, BookingController.getBookingById);

// Update booking (including status changes)
router.patch(
	"/:bookingId",
	authenticateToken,
	validate(updateBookingStatusSchema),
	BookingController.updateBookingStatus
);

export default router;
