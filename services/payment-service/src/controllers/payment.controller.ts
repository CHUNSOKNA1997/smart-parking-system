import type { Request, Response } from "express";
import { paymentService } from "../services/payment.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

export class PaymentController {
    /**
     * Creates a new KHQR payment for a booking.
     * Generates QR code and optional deeplink for payment processing.
     *
     * @route POST /api/v1/payments
     */
    async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId, amount, currency, description } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            const payment = await paymentService.createPayment({
                bookingId,
                userId,
                amount,
                currency,
                description,
            });

            res.status(201).json(
                successResponse("Payment created successfully", payment)
            );
        } catch (error: any) {
            console.error("[PAYMENT] Create payment error:", error);
            res.status(500).json(
                errorResponse("Failed to create payment", error.message)
            );
        }
    }

    /**
     * Retrieves payment details by payment ID.
     *
     * @route GET /api/v1/payments/:id
     */
    async getPaymentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const payment = await paymentService.getPaymentById(id);

            res.status(200).json(
                successResponse("Payment retrieved successfully", payment)
            );
        } catch (error: any) {
            console.error("[PAYMENT] Get payment error:", error);
            res.status(404).json(
                errorResponse("Payment not found", error.message)
            );
        }
    }

    /**
     * Checks payment status using MD5 hash for automatic polling.
     * This endpoint is used by clients to poll for payment completion without manual hash entry.
     *
     * @route POST /api/v1/payments/check
     */
    async checkPayment(req: Request, res: Response): Promise<void> {
        try {
            const { md5 } = req.body;

            if (!md5) {
                res.status(400).json(errorResponse("MD5 hash is required"));
                return;
            }

            const result = await paymentService.checkPaymentByMD5(md5);

            res.status(200).json(successResponse("Payment confirmed", result));
        } catch (error: any) {
            console.error("[PAYMENT] Check payment error:", error);
            // Return 400 for pending payments during polling (not an error condition)
            // Payment may not be completed yet by the user
            res.status(400).json(
                errorResponse(
                    "Payment not found or not completed",
                    error.message
                )
            );
        }
    }

    /**
     * Retrieves all payments for a specific user.
     *
     * @route GET /api/v1/payments/user/:userId
     */
    async getUserPayments(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            const payments = await paymentService.getPaymentsByUserId(userId);

            res.status(200).json(
                successResponse("Payments retrieved successfully", payments)
            );
        } catch (error: any) {
            console.error("[PAYMENT] Get user payments error:", error);
            res.status(500).json(
                errorResponse("Failed to retrieve payments", error.message)
            );
        }
    }

    /**
     * Retrieves all payments for a specific booking.
     *
     * @route GET /api/v1/payments/booking/:bookingId
     */
    async getBookingPayments(req: Request, res: Response): Promise<void> {
        try {
            const { bookingId } = req.params;

            const payments =
                await paymentService.getPaymentsByBookingId(bookingId);

            res.status(200).json(
                successResponse("Payments retrieved successfully", payments)
            );
        } catch (error: any) {
            console.error("[PAYMENT] Get booking payments error:", error);
            res.status(500).json(
                errorResponse("Failed to retrieve payments", error.message)
            );
        }
    }

    /**
     * Generates a QR code image for a payment.
     *
     * @route GET /api/v1/payments/:id/qr
     */
    async getQRImage(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const qrImage = await paymentService.generateQRImage(id);

            res.status(200).json(
                successResponse("QR image generated successfully", { qrImage })
            );
        } catch (error: any) {
            console.error("[PAYMENT] Get QR image error:", error);
            res.status(500).json(
                errorResponse("Failed to generate QR image", error.message)
            );
        }
    }
}

/**
 * Singleton instance of PaymentController.
 * Use this instance for handling payment-related HTTP requests.
 */
export const paymentController = new PaymentController();
