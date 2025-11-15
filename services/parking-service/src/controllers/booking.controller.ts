import { Response } from "../types/index.js";
import BookingModel from "../models/Booking.model.js";
import ParkingSpotModel from "../models/ParkingSpot.model.js";
import TransactionModel from "../models/Transaction.model.js";
import { generateQRCode } from "../services/qr.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

import { AuthRequest } from "../types/index.js";

class BookingController {
	/**
	 * Creates a new parking booking for a user.
	 * Validates spot availability, generates QR code, and creates transaction record.
	 *
	 * @route POST /api/v1/bookings
	 */
	static async createBooking(
		req: AuthRequest,
		res: Response
	): Promise<Response> {
		try {
			const { spotId, durationHours } = req.body;
			const userId = req.user!.userId;

			// Validate that the parking spot exists and is available for booking
			const spot = await ParkingSpotModel.findById(spotId);
			if (!spot) {
				return sendError(res, 404, "Parking spot not found");
			}

			if (!spot.isAvailable) {
				return sendError(res, 400, "Parking spot is not available");
			}

			// Prevent users from creating multiple active bookings simultaneously
			const activeBooking = await BookingModel.findActiveByUserId(userId);
			if (activeBooking) {
				return sendError(
					res,
					400,
					"You already have an active booking"
				);
			}

			// Calculate total booking cost based on hourly rate and duration
			const totalPrice =
				Number(spot.pricePerHour) * Number(durationHours);

			// Prepare QR code data payload for booking verification
			const qrCodeData = {
				bookingId: "temp", // Will be replaced with actual ID
				spotId,
				userId,
				startTime: new Date().toISOString(),
			};

			// Create initial booking record in database
			const booking = await BookingModel.create({
				userId,
				spotId,
				durationHours,
				totalPrice,
				qrCode: null, // Will be generated after booking ID is assigned
			});

			// Update QR code data with the actual booking ID
			qrCodeData.bookingId = booking.id;
			const qrCode = await generateQRCode(qrCodeData);

			// Update booking status to reserved
			const updatedBooking = await BookingModel.updateStatus(
				booking.id,
				"reserved"
			);
			updatedBooking.qrCode = qrCode;

			// Mark the parking spot as unavailable
			await ParkingSpotModel.updateAvailability(spotId, false);

			// Create transaction record for payment tracking
			await TransactionModel.create({
				bookingId: booking.id,
				userId,
				amount: totalPrice,
				paymentMethod: "cash",
				description: `Parking booking for spot ${spotId}`,
			});

			console.log(`[BOOKING] Booking created: ${booking.id} for user: ${userId}`);

			return sendSuccess(res, 201, "Booking created successfully", {
				booking: {
					...updatedBooking,
					qrCode,
				},
			});
		} catch (error) {
			console.error("[BOOKING] Create booking error:", error);
			return sendError(
				res,
				500,
				"Failed to create booking",
				error.message
			);
		}
	}

	/**
	 * Retrieves all bookings for the authenticated user.
	 * Optionally filters by booking status.
	 *
	 * @route GET /api/v1/bookings
	 */
	static async getUserBookings(
		req: AuthRequest,
		res: Response
	): Promise<Response> {
		try {
			const userId = req.user!.userId;
			const { status } = req.query;

			const bookings = await BookingModel.findByUserId(userId, status);

			return sendSuccess(res, 200, "Bookings retrieved successfully", {
				bookings,
				count: bookings.length,
			});
		} catch (error) {
			console.error("[BOOKING] Get user bookings error:", error);
			return sendError(
				res,
				500,
				"Failed to retrieve bookings",
				error.message
			);
		}
	}

	/**
	 * Retrieves a specific booking by its ID.
	 * Validates that the booking belongs to the authenticated user.
	 *
	 * @route GET /api/v1/bookings/:bookingId
	 */
	static async getBookingById(
		req: AuthRequest,
		res: Response
	): Promise<Response> {
		try {
			const { bookingId } = req.params;
			const userId = req.user!.userId;

			const booking = await BookingModel.findById(bookingId);

			if (!booking) {
				return sendError(res, 404, "Booking not found");
			}

			// Ensure user can only access their own bookings
			if (booking.userId !== userId) {
				return sendError(res, 403, "Access denied");
			}

			return sendSuccess(res, 200, "Booking retrieved successfully", {
				booking,
			});
		} catch (error) {
			console.error("[BOOKING] Get booking by ID error:", error);
			return sendError(
				res,
				500,
				"Failed to retrieve booking",
				error.message
			);
		}
	}

	/**
	 * Retrieves the currently active booking for the authenticated user.
	 *
	 * @route GET /api/v1/bookings/active
	 */
	static async getActiveBooking(
		req: AuthRequest,
		res: Response
	): Promise<Response> {
		try {
			const userId = req.user!.userId;

			const booking = await BookingModel.findActiveByUserId(userId);

			if (!booking) {
				return sendError(res, 404, "No active booking found");
			}

			return sendSuccess(
				res,
				200,
				"Active booking retrieved successfully",
				{ booking }
			);
		} catch (error) {
			console.error("[BOOKING] Get active booking error:", error);
			return sendError(
				res,
				500,
				"Failed to retrieve active booking",
				error.message
			);
		}
	}

	/**
	 * Updates the status of a booking (e.g., completed, cancelled).
	 * Releases the parking spot when booking is completed or cancelled.
	 *
	 * @route PATCH /api/v1/bookings/:bookingId/status
	 */
	static async updateBookingStatus(
		req: AuthRequest,
		res: Response
	): Promise<Response> {
		try {
			const { bookingId } = req.params;
			const { status } = req.body;
			const userId = req.user!.userId;

			const booking = await BookingModel.findById(bookingId);

			if (!booking) {
				return sendError(res, 404, "Booking not found");
			}

			// Ensure user can only modify their own bookings
			if (booking.userId !== userId) {
				return sendError(res, 403, "Access denied");
			}

			const endTime = ["completed", "cancelled"].includes(status)
				? new Date()
				: null;
			const updatedBooking = await BookingModel.updateStatus(
				bookingId,
				status,
				endTime
			);

			// Release the parking spot when booking ends
			if (["completed", "cancelled"].includes(status)) {
				await ParkingSpotModel.updateAvailability(booking.spotId, true);
			}

			console.log(`[BOOKING] Booking ${bookingId} status updated to: ${status}`);

			return sendSuccess(
				res,
				200,
				"Booking status updated successfully",
				{ booking: updatedBooking }
			);
		} catch (error) {
			console.error("[BOOKING] Update booking status error:", error);
			return sendError(
				res,
				500,
				"Failed to update booking status",
				error.message
			);
		}
	}

}

export default BookingController;
