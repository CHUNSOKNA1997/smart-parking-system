import type { Request, Response } from "express";
import { paymentService } from "../services/payment.service.js";
import { abaService } from "../services/aba.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import prisma from "../config/prisma.js";
import { PaymentStatus } from "@prisma/client";
import axios from "axios";

/**
 * ABA PayWay Callback Controller
 * Handles webhook callbacks from ABA PayWay after payment completion
 */
export class ABACallbackController {
    /**
     * Handles ABA PayWay callback after payment completion.
     * This endpoint is called by ABA PayWay servers, so it doesn't use auth middleware.
     *
     * @route POST /api/v1/payments/aba-callback
     */
    async handleCallback(req: Request, res: Response): Promise<void> {
        try {
            console.log("[ABA CALLBACK] Received callback:", JSON.stringify(req.body, null, 2));

            const {
                tran_id,
                status,
                amount,
                hash,
                payment_option,
                firstname,
                lastname,
                email,
                phone,
                req_time
            } = req.body;

            // Verify the hash to ensure the callback is legitimate
            const isValid = abaService.verifyCallbackHash(req.body);

            if (!isValid) {
                console.error("[ABA CALLBACK] Invalid hash");
                res.status(400).json(errorResponse("Invalid callback hash"));
                return;
            }

            // Status codes from ABA:
            // 0 = Success
            // 1 = Pending
            // 2 = Failed
            // 3 = Cancelled
            if (status !== "0") {
                console.log(`[ABA CALLBACK] Payment not successful. Status: ${status}`);
                res.status(200).json(successResponse("Callback received"));
                return;
            }

            // Find the payment record using the transaction ID
            // Note: We need to extract the original payment ID from tran_id
            // The tran_id format is: timestamp (10 chars) + UUID prefix (10 chars)
            const payments = await prisma.kHQRPayment.findMany({
                where: {
                    paymentMethod: "aba",
                    status: PaymentStatus.PENDING,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            // Find the payment that matches this transaction
            // We'll need to match by bookingId or amount since tran_id is transformed
            let payment = null;
            for (const p of payments) {
                // Match by amount (converted to string with 2 decimals)
                if (Number(p.amount).toFixed(2) === amount) {
                    payment = p;
                    break;
                }
            }

            if (!payment) {
                console.error("[ABA CALLBACK] Payment not found for tran_id:", tran_id);
                res.status(404).json(errorResponse("Payment not found"));
                return;
            }

            // Update payment status to PAID
            const updatedPayment = await prisma.kHQRPayment.update({
                where: { id: payment.id },
                data: {
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                    transactionHash: tran_id, // Store ABA transaction ID
                },
            });

            console.log(`[ABA CALLBACK] Payment ${payment.id} marked as PAID`);

            // Update booking status if bookingId exists
            if (payment.bookingId) {
                try {
                    const parkingServiceUrl = process.env.PARKING_SERVICE_URL || "http://localhost:3002";
                    const bookingUpdateUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/confirm-payment`;

                    console.log(`[ABA CALLBACK] Updating booking ${payment.bookingId} via ${bookingUpdateUrl}`);

                    await axios.post(
                        bookingUpdateUrl,
                        {
                            paymentId: payment.id,
                            transactionId: tran_id,
                            amount: Number(payment.amount),
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    console.log(`[ABA CALLBACK] Booking ${payment.bookingId} updated successfully`);
                } catch (bookingError: any) {
                    console.error(
                        "[ABA CALLBACK] Failed to update booking:",
                        bookingError.response?.data || bookingError.message
                    );
                    // Don't fail the callback if booking update fails
                    // The payment is still successful
                }
            }

            res.status(200).json(successResponse("Payment processed successfully"));
        } catch (error: any) {
            console.error("[ABA CALLBACK] Error processing callback:", error);
            res.status(500).json(
                errorResponse("Failed to process callback", error.message)
            );
        }
    }


}

/**
 * Singleton instance of ABACallbackController.
 * Use this instance for handling ABA callback requests.
 */
export const abaCallbackController = new ABACallbackController();
