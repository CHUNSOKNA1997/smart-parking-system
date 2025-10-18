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
router.post(
	"/",
	authenticateToken,
	validate(createBookingSchema),
	BookingController.createBooking
);
router.get("/user", authenticateToken, BookingController.getUserBookings);
router.get("/active", authenticateToken, BookingController.getActiveBooking);
router.get("/:bookingId", authenticateToken, BookingController.getBookingById);
router.patch(
	"/:bookingId/status",
	authenticateToken,
	validate(updateBookingStatusSchema),
	BookingController.updateBookingStatus
);
router.post(
	"/:bookingId/cancel",
	authenticateToken,
	BookingController.cancelBooking
);
router.post(
	"/:bookingId/complete",
	authenticateToken,
	BookingController.completeBooking
);

export default router;
