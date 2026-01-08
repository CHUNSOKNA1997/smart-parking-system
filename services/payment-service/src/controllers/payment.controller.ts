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
     * Manually confirms a payment and updates booking status.
     * This is a workaround for when ABA callback doesn't trigger (sandbox testing).
     * Mobile app calls this after user returns from ABA payment.
     *
     * @route POST /api/v1/payments/:id/confirm
     */
    async confirmPaymentManually(req: Request, res: Response): Promise<void> {
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

            // Verify the payment belongs to the user
            if (payment.userId !== userId) {
                res.status(403).json(errorResponse("Access denied"));
                return;
            }

            // If payment is already paid, just return success
            if (payment.status === "PAID") {
                res.status(200).json(
                    successResponse("Payment already confirmed", { payment })
                );
                return;
            }

            // Update payment status to PAID
            const updatedPayment = await prisma.kHQRPayment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                },
            });

            console.log(`[payment] Manual confirmation: Payment ${payment.id} marked as PAID`);

            // Update booking status if bookingId exists
            if (payment.bookingId) {
                try {
                    const parkingServiceUrl = process.env.PARKING_SERVICE_URL || "http://localhost:3002";
                    const bookingUpdateUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/confirm-payment`;

                    console.log(`[payment] Updating booking ${payment.bookingId} via ${bookingUpdateUrl}`);

                    await axios.post(
                        bookingUpdateUrl,
                        {
                            paymentId: payment.id,
                            transactionId: payment.id,
                            amount: Number(payment.amount),
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    console.log(`[payment] Booking ${payment.bookingId} updated successfully`);
                } catch (bookingError: any) {
                    console.error(
                        "[PAYMENT] Failed to update booking:",
                        bookingError.response?.data || bookingError.message
                    );
                    // Return error to mobile app so they know booking wasn't updated
                    res.status(500).json(
                        errorResponse(
                            "Payment confirmed but booking update failed",
                            bookingError.response?.data?.error || bookingError.message
                        )
                    );
                    return;
                }
            }

            res.status(200).json(
                successResponse("Payment confirmed successfully", {
                    payment: updatedPayment,
                    bookingUpdated: !!payment.bookingId,
                })
            );
        } catch (error: any) {
            console.error("[payment] Manual confirm error:", error);
            res.status(500).json(
                errorResponse("Failed to confirm payment", error.message)
            );
        }
    }

    /**
     * Retrieves all payments for a specific user.
     *
     * @route GET /api/v1/payments/users/:userId
     */
    async getUserPayments(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

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
}

/**
 * Singleton instance of PaymentController.
 * Use this instance for handling payment-related HTTP requests.
 */
export const paymentController = new PaymentController();
