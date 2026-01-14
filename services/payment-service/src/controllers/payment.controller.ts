import type { Request, Response } from "express";
import { paymentService } from "../services/payment.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import prisma from "../config/prisma.js";
import { PaymentStatus } from "@prisma/client";
import axios from "axios";
import { cacheIdempotentResponse } from "../middleware/idempotency.middleware.js";

export class PaymentController {
    /**
     * Creates a new payment for a booking.
     * Generates payment via ABA PayWay.
     *
     * @route POST /api/v1/payments
     */
    async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId, bookings, amount, currency, description, paymentMethod } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            // Get auth token from request header
            const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
            
            if (!authToken) {
                res.status(401).json(errorResponse("Authorization token required"));
                return;
            }

            const payment = await paymentService.createPayment({
                bookingId,
                bookings,
                userId,
                amount,
                currency,
                description,
                paymentMethod,
            }, authToken);

            const responseData = successResponse("Payment created successfully", payment);

            // Cache response if idempotency key was provided
            if (req.shouldCacheResponse && req.idempotencyKey) {
                const requestHash = (req as any).requestHash;
                await cacheIdempotentResponse(
                    req.idempotencyKey,
                    requestHash,
                    201,
                    responseData
                );
            }

            res.status(201).json(responseData);
        } catch (error: any) {
            console.error("[payment] Create payment error:", error);
            res.status(500).json(
                errorResponse("Failed to create payment", error.message)
            );
        }
    }



    /**
     * Cancels a payment and updates booking status if needed.
     *
     * @route POST /api/v1/payments/:id/cancel
     */
    async cancelPayment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            const payment = await paymentService.getPaymentById(id);

            if (!payment) {
                res.status(404).json(errorResponse("Payment not found"));
                return;
            }

            if (payment.userId !== userId) {
                res.status(403).json(errorResponse("Access denied"));
                return;
            }

            if (payment.status === PaymentStatus.PAID) {
                res.status(400).json(errorResponse("Payment already completed"));
                return;
            }

            if (payment.status === PaymentStatus.CANCELLED) {
                res.status(200).json(
                    successResponse("Payment already cancelled", { payment })
                );
                return;
            }

            const updatedPayment = await prisma.transaction.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.CANCELLED,
                },
            });

            console.log(`[payment] Payment ${payment.id} marked as CANCELLED`);

            if (payment.bookingId) {
                try {
                    const parkingServiceUrl =
                        process.env.PARKING_SERVICE_URL || "http://localhost:3002";
                    const bookingCancelUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/cancel-payment`;

                    console.log(
                        `[payment] Cancelling booking ${payment.bookingId} via ${bookingCancelUrl}`
                    );

                    await axios.post(
                        bookingCancelUrl,
                        {
                            paymentId: payment.id,
                            amount: Number(payment.amount),
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );
                } catch (bookingError: any) {
                    console.error(
                        "[PAYMENT] Failed to cancel booking:",
                        bookingError.response?.data || bookingError.message
                    );
                }
            }

            res.status(200).json(
                successResponse("Payment cancelled successfully", {
                    payment: updatedPayment,
                    bookingUpdated: !!payment.bookingId,
                })
            );
        } catch (error: any) {
            console.error("[payment] Cancel payment error:", error);
            res.status(500).json(
                errorResponse("Failed to cancel payment", error.message)
            );
        }
    }

    /**
     * Cancels a payment by booking ID (internal use from booking-service).
     *
     * @route POST /api/v1/payments/booking/:bookingId/cancel
     */
    async cancelPaymentByBookingId(req: Request, res: Response): Promise<void> {
        try {
            const internalKey = process.env.PAYMENT_INTERNAL_KEY;
            const providedKey = req.header("x-internal-key");
            if (internalKey && providedKey !== internalKey) {
                res.status(401).json(errorResponse("Unauthorized", "UNAUTHORIZED"));
                return;
            }

            const { bookingId } = req.params;
            const payment = await paymentService.cancelPaymentByBookingId(bookingId);

            if (!payment) {
                res.status(404).json(errorResponse("Payment not found"));
                return;
            }

            console.log(
                `[payment] Payment ${payment.id} cancelled via booking ${bookingId}`
            );

            res.status(200).json(
                successResponse("Payment cancelled successfully", {
                    payment,
                })
            );
        } catch (error: any) {
            console.error("[payment] Cancel by booking error:", error);
            res.status(500).json(
                errorResponse("Failed to cancel payment", error.message)
            );
        }
    }

    /**
     * Retrieves all payments for a specific user.
     *
     * @route GET /api/v1/users/:userId/payments
     */
    async getUserPayments(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const authUserId = req.user?.userId;
            if (!authUserId) {
                res.status(401).json(errorResponse("Unauthorized", "UNAUTHORIZED"));
                return;
            }
            if (authUserId !== userId) {
                res.status(403).json(errorResponse("Access denied", "FORBIDDEN"));
                return;
            }

            const payments = await paymentService.getPaymentsByUserId(userId);

            res.status(200).json(
                successResponse("Payments retrieved successfully", payments)
            );
        } catch (error: any) {
            console.error("[payment] Get user payments error:", error);
            res.status(500).json(
                errorResponse("Failed to retrieve payments", error.message)
            );
        }
    }

    /**
     * Retrieves all payments for the authenticated user.
     *
     * @route GET /api/v1/payments/me
     */
    async getMyPayments(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json(errorResponse("Unauthorized", "UNAUTHORIZED"));
                return;
            }

            const payments = await paymentService.getPaymentsByUserId(userId);

            res.status(200).json(
                successResponse("Payments retrieved successfully", payments)
            );
        } catch (error: any) {
            console.error("[payment] Get my payments error:", error);
            res.status(500).json(
                errorResponse("Failed to retrieve payments", error.message)
            );
        }
    }
}

/**
 * Singleton instance of PaymentController.
 * Use this instance for handling payment-related HTTP requests.
 */
export const paymentController = new PaymentController();
