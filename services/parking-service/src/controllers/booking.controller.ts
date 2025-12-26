import { Response } from "../types/index.js";
import BookingModel from "../models/Booking.model.js";
import ParkingSpotModel from "../models/ParkingSpot.model.js";
import TransactionModel from "../models/Transaction.model.js";
import prisma from "../config/prisma.js";
import { generateQRCode, generateQRFromString } from "../services/qr.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { BookingStatus, PaymentMethod } from "@prisma/client";
import axios from "axios";

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
            let { spotId, durationHours, startTime, endTime, paymentMethod, currency } = req.body;
            const userId = req.user!.userId;

            // Calculate duration if not provided
            if (!durationHours) {
                if (!startTime || !endTime) {
                    return sendError(
                        res,
                        400,
                        "Either durationHours or startTime/endTime must be provided"
                    );
                }
                const start = new Date(startTime);
                const end = new Date(endTime);
                const diffMs = end.getTime() - start.getTime();
                durationHours = diffMs / (1000 * 60 * 60);

                if (durationHours <= 0) {
                    return sendError(
                        res,
                        400,
                        "End time must be after start time"
                    );
                }
            }

            // Prevent users from creating multiple active bookings simultaneously
            const activeBooking = await BookingModel.findActiveByUserId(userId);
            if (activeBooking) {
                if (activeBooking.status === BookingStatus.ACTIVE) {
                    return sendError(
                        res,
                        400,
                        "You already have an active booking"
                    );
                }

                // If status is RESERVED, we cancel it to allow the new booking (e.g. user changing payment method)
                // This must happen BEFORE checking spot availability to avoid "spot taken" error
                if (activeBooking.status === BookingStatus.RESERVED) {
                    console.log(`[BOOKING] Auto-cancelling existing RESERVED booking ${activeBooking.id}`);
                    await BookingModel.updateStatus(activeBooking.id, BookingStatus.CANCELLED, new Date());
                    await ParkingSpotModel.updateAvailability(activeBooking.spotId, true);
                }
            }



            // Validate that the parking spot exists and is available for booking
            const spot = await ParkingSpotModel.findById(spotId);
            if (!spot) {
                return sendError(res, 404, "Parking spot not found");
            }

            if (!spot.isAvailable) {
                return sendError(res, 400, "Parking spot is not available");
            }

            // Calculate total booking cost based on hourly rate and duration
            const totalPrice =
                Number(spot.pricePerHour) * Number(durationHours);

            // Create booking record with transaction for atomicity
            const booking = await prisma.$transaction(async (tx) => {
                // Create booking
                const newBooking = await tx.booking.create({
                    data: {
                        userId,
                        spotId,
                        durationHours,
                        totalPrice,
                        status: BookingStatus.RESERVED,
                    },
                });

                // Reserve the parking spot
                await tx.parkingSpot.update({
                    where: { id: spotId },
                    data: { isAvailable: false },
                });

                // Create transaction record for payment tracking
                await tx.transaction.create({
                    data: {
                        bookingId: newBooking.id,
                        userId,
                        amount: totalPrice,
                        paymentMethod: paymentMethod === 'aba' ? PaymentMethod.ABA : (paymentMethod === 'khqr' ? PaymentMethod.KHQR : PaymentMethod.CASH),
                        description: `Parking booking for spot ${spotId}`,
                    },
                });

                return newBooking;
            });

            console.log(`[BOOKING] Booking created in transaction: ${booking.id}`);

            console.log(
                `[BOOKING] Booking created: ${booking.id} for user: ${userId}`
            );

            // Return booking only (payment must be created by client via /api/v1/payments)
            return sendSuccess(res, 201, "Booking created successfully", {
                booking: {
                    id: booking.id,
                    userId: booking.userId,
                    spotId: booking.spotId,
                    durationHours: booking.durationHours,
                    totalPrice: booking.totalPrice,
                    status: booking.status,
                    createdAt: booking.createdAt,
                }
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
     * Retrieves all bookings for the authenticated user with pagination.
     * Uses POST method to accept pagination parameters in request body.
     *
     * @route POST /api/v1/bookings/me
     */
    static async getUserBookings(
        req: AuthRequest,
        res: Response
    ): Promise<Response> {
        try {
            const userId = req.user!.userId;
            const {
                status,
                page = 1,
                limit = 20,
                sortField = 'createdAt',
                sortOrder = 'desc'
            } = req.body;

            // Validate pagination parameters
            const validPage = Math.max(1, parseInt(page as string) || 1);
            const validLimit = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

            // Validate sort field
            const allowedSortFields = ['createdAt', 'totalPrice', 'status', 'durationHours'];
            const validSortField = allowedSortFields.includes(sortField) ? sortField : 'createdAt';

            // Validate sort order
            const validSortOrder = sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

            const result = await BookingModel.findByUserId(userId, {
                status,
                page: validPage,
                limit: validLimit,
                sortField: validSortField,
                sortOrder: validSortOrder
            });

            return sendSuccess(res, 200, "Bookings retrieved successfully", result);
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

            const endTime = [
                BookingStatus.COMPLETED,
                BookingStatus.CANCELLED,
            ].includes(status)
                ? new Date()
                : null;
            const updatedBooking = await BookingModel.updateStatus(
                bookingId,
                status,
                endTime
            );

            // Release the parking spot when booking ends
            if (
                [BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(
                    status
                )
            ) {
                await ParkingSpotModel.updateAvailability(booking.spotId, true);
            }

            console.log(
                `[BOOKING] Booking ${bookingId} status updated to: ${status}`
            );

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

    /**
     * Confirms payment for a booking and updates its status to ACTIVE.
     * Called by the payment service after successful payment.
     *
     * @route POST /api/v1/bookings/:bookingId/confirm-payment
     */
    static async confirmPayment(
        req: AuthRequest,
        res: Response
    ): Promise<Response> {
        try {
            const { bookingId } = req.params;
            const { paymentId, transactionId, amount } = req.body;

            console.log(`[BOOKING] Confirming payment for booking ${bookingId}`);

            const booking = await BookingModel.findById(bookingId);

            if (!booking) {
                return sendError(res, 404, "Booking not found");
            }

            // Validate booking is in correct state
            if (booking.status !== BookingStatus.RESERVED) {
                return sendError(
                    res,
                    400,
                    `Cannot confirm payment for booking with status: ${booking.status}`
                );
            }

            // Validate payment amount matches booking total
            if (amount && Number(amount).toFixed(2) !== Number(booking.totalPrice).toFixed(2)) {
                console.warn(
                    `[BOOKING] Payment amount mismatch. Expected: ${booking.totalPrice}, Received: ${amount}`
                );
                // Continue anyway - log the discrepancy but don't block
            }

            // Update booking status to ACTIVE
            const updatedBooking = await BookingModel.updateStatus(
                bookingId,
                BookingStatus.ACTIVE
            );

            // Update transaction record if exists
            if (paymentId) {
                try {
                    await prisma.transaction.updateMany({
                        where: {
                            bookingId,
                        },
                        data: {
                            status: "COMPLETED",
                        },
                    });
                } catch (txError) {
                    console.error(
                        "[BOOKING] Failed to update transaction:",
                        txError
                    );
                    // Don't fail the request if transaction update fails
                }
            }

            console.log(
                `[BOOKING] Payment confirmed for booking ${bookingId}. Status updated to ACTIVE`
            );

            return sendSuccess(
                res,
                200,
                "Payment confirmed and booking activated",
                { booking: updatedBooking }
            );
        } catch (error) {
            console.error("[BOOKING] Confirm payment error:", error);
            return sendError(
                res,
                500,
                "Failed to confirm payment",
                error.message
            );
        }
    }
}

export default BookingController;
