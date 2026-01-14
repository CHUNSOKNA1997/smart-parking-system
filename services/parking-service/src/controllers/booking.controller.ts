import { Response } from "../types/index.js";
import BookingModel from "../models/Booking.model.js";
import ParkingSpotModel from "../models/ParkingSpot.model.js";
import prisma from "../config/prisma.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { BookingStatus, PaymentMethod } from "@prisma/client";

import { AuthRequest } from "../types/index.js";

class BookingController {
    static computeEndTime(startTime: Date, durationHours?: number): Date | null {
        if (durationHours == null) {
            return null;
        }
        const durationMs = Number(durationHours) * 60 * 60 * 1000;
        if (Number.isNaN(durationMs)) {
            return null;
        }
        return new Date(startTime.getTime() + durationMs);
    }
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
                    const activeEndTime = BookingModel.computeEndTime(activeBooking);
                    if (activeEndTime && activeEndTime < new Date()) {
                        console.log(`[booking] Auto-completing expired ACTIVE booking ${activeBooking.id}`);
                        await BookingModel.updateStatus(
                            activeBooking.id,
                            BookingStatus.COMPLETED,
                            activeEndTime
                        );
                        await ParkingSpotModel.updateAvailability(activeBooking.spotId, true);
                    } else {
                        return sendError(
                            res,
                            400,
                            "You already have an active booking"
                        );
                    }
                } else if (activeBooking.status === BookingStatus.RESERVED) {
                    // If status is RESERVED, we cancel it to allow the new booking (e.g. user changing payment method)
                    // This must happen BEFORE checking spot availability to avoid "spot taken" error
                    console.log(`[booking] Auto-cancelling existing RESERVED booking ${activeBooking.id}`);
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
            // Apply currency conversion if requested (default to USD)
            const EXCHANGE_RATE = 4100; // USD to KHR
            const targetCurrency = currency || "USD";
            const baseTotalPrice = Number(spot.pricePerHour) * Number(durationHours);
            const totalPrice = targetCurrency === "KHR" 
                ? baseTotalPrice * EXCHANGE_RATE 
                : baseTotalPrice;

            const startDate = startTime ? new Date(startTime) : new Date();
            const endDate = endTime
                ? new Date(endTime)
                : BookingController.computeEndTime(startDate, durationHours);

            // Create booking record with transaction for atomicity
            const booking = await prisma.$transaction(async (tx) => {
                // Create booking
                const newBooking = await tx.booking.create({
                    data: {
                        userId,
                        spotId,
                        startTime: startDate,
                        endTime: endDate,
                        durationHours,
                        totalPrice,
                        currency: targetCurrency,
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

            console.log(`[booking] Booking created in transaction: ${booking.id}`);

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
                    currency: booking.currency || targetCurrency,
                    status: booking.status,
                    createdAt: booking.createdAt,
                }
            });
        } catch (error) {
            console.error("[booking] Create booking error:", error);
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
            console.error("[booking] Get user bookings error:", error);
            return sendError(
                res,
                500,
                "Failed to retrieve bookings",
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

            console.log(`[booking] Confirming payment for booking ${bookingId}`);

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
            console.error("[booking] Confirm payment error:", error);
            return sendError(
                res,
                500,
                "Failed to confirm payment",
                error.message
            );
        }
    }

    /**
     * Cancels a booking when payment expires.
     * Called by the payment service after QR expiration.
     *
     * @route POST /api/v1/bookings/:bookingId/cancel-payment
     */
    static async cancelPayment(
        req: AuthRequest,
        res: Response
    ): Promise<Response> {
        try {
            const { bookingId } = req.params;

            console.log(`[booking] Cancelling booking ${bookingId} due to payment expiry`);

            const booking = await BookingModel.findById(bookingId);

            if (!booking) {
                return sendError(res, 404, "Booking not found");
            }

            if (booking.status !== BookingStatus.RESERVED) {
                return sendError(
                    res,
                    400,
                    `Cannot cancel booking with status: ${booking.status}`
                );
            }

            const cancelledBooking = await prisma.$transaction(async (tx) => {
                const updated = await tx.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: BookingStatus.CANCELLED,
                        endTime: new Date(),
                    },
                });

                await tx.parkingSpot.update({
                    where: { id: booking.spotId },
                    data: { isAvailable: true },
                });

                await tx.transaction.updateMany({
                    where: {
                        bookingId,
                        status: { not: "COMPLETED" },
                    },
                    data: { status: "FAILED" },
                });

                return updated;
            });

            console.log(
                `[booking] Booking ${bookingId} cancelled due to payment expiry`
            );

            return sendSuccess(
                res,
                200,
                "Booking cancelled due to payment expiry",
                { booking: cancelledBooking }
            );
        } catch (error) {
            console.error("[booking] Cancel payment error:", error);
            return sendError(
                res,
                500,
                "Failed to cancel booking",
                error.message
            );
        }
    }
}

export default BookingController;
