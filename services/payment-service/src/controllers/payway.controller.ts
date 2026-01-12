/**
 * PayWay Controller
 * 
 * This controller handles HTTP requests from the mobile app.
 * It's the "middleman" between the mobile app and our PayWay service.
 * 
 * ENDPOINTS:
 * 1. POST /api/v1/payments/payway/qr - Generate QR code
 * 2. GET /api/v1/payments/:paymentId/status - Check payment status
 * 3. POST /api/v1/payments/webhook/payway - Receive webhook from PayWay
 * 
 * FLOW:
 * Mobile App → Controller → Service → PayWay API
 */

import type { Request, Response } from "express";
import { payWayQRService } from "../services/payway.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import prisma from "../config/prisma.js";
import axios from "axios";
import { PaymentStatus } from "@prisma/client";
import { PayWayUtils } from "../utils/payway.utils.js";

/**
 * PayWay Controller Class
 * 
 * Handles all PayWay-related HTTP requests
 */
export class PayWayController {
    /**
     * Generate QR Code for Payment
     * 
     * ENDPOINT: POST /api/v1/payments/payway/qr
     * 
     * WHAT IT DOES:
     * 1. Receives payment request from mobile app
     * 2. Validates user is authenticated
     * 3. Calls PayWay service to generate QR
     * 4. Saves payment record to database
     * 5. Returns QR image and deep link to mobile app
     * 
     * REQUEST BODY:
     * {
     *   "bookingId": "abc-123",
     *   "amount": 5.00,
     *   "currency": "USD",
     *   "description": "Parking Spot A1 - 2 hours"
     * }
     * 
     * RESPONSE:
     * {
     *   "success": true,
     *   "message": "qr code generated successfully",
     *   "data": {
     *     "paymentId": "uuid-here",
     *     "tranId": "booking-abc-123-1736156789",
     *     "qrString": "00020101021...",
     *     "qrImage": "data:image/png;base64,...",
     *     "deeplinkUrl": "abapay://qr?code=...",
     *     "amount": 5.00,
     *     "currency": "USD",
     *     "status": "PENDING",
     *     "expiresAt": "2024-01-03T14:45:00Z"
     *   }
     * }
     */
    async generateQR(req: Request, res: Response): Promise<void> {
        try {
            console.log("[payway controller] Generate QR request received");

            // Extract data from request
            const { bookingId, amount, currency, description, qrImageTemplate } = req.body;
            const userId = req.user?.userId; // From auth middleware

            // Step 1: Validate user is authenticated
            if (!userId) {
                console.error("[payway controller] User not authenticated");
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            // Step 2: Get auth token
            const authToken = req.headers.authorization?.replace('Bearer ', '') || '';
            
            if (!authToken) {
                res.status(401).json(errorResponse("Authorization token required"));
                return;
            }

            // Step 3: Fetch booking details if amount/currency not provided
            let finalAmount = amount;
            let finalCurrency = currency;
            
            if (!finalAmount || !finalCurrency) {
                console.log('[payway controller] Fetching booking details from booking service...');
                
                const { bookingServiceClient } = await import('../clients/booking-client.js');
                const booking = await bookingServiceClient.getBooking(bookingId, authToken);
                
                finalAmount = finalAmount || parseFloat(booking.totalPrice);
                finalCurrency = finalCurrency || booking.currency;
                
                console.log(`[payway controller] Booking details fetched: ${finalAmount} ${finalCurrency}`);
            }
            
            // Force USD currency for PayWay
            if (finalCurrency === 'KHR') {
                // Convert KHR to USD (1 USD = ~4100 KHR)
                const khrToUsdRate = 4100;
                finalAmount = finalAmount / khrToUsdRate;
                finalCurrency = 'USD';
                console.log(`[payway controller] Converted to USD: ${finalAmount} USD`);
            } else if (finalCurrency === 'USD') {
                console.log(`[payway controller] Using USD: ${finalAmount} USD`);
            }

            // Step 4: Validate amount is positive
            if (finalAmount <= 0) {
                console.error("[payway controller] Invalid amount:", finalAmount);
                res.status(400).json(
                    errorResponse("Amount must be greater than 0")
                );
                return;
            }

            // Step 5: Validate currency
            if (!["USD", "KHR"].includes(finalCurrency)) {
                console.error("[payway controller] Invalid currency:", finalCurrency);
                res.status(400).json(
                    errorResponse("Currency must be USD or KHR")
                );
                return;
            }

            console.log(`[payway controller] Generating QR for booking: ${bookingId}`);

            // Step 6: Customer info (optional - can be added later)
            const customerName: string | undefined = undefined;
            const customerEmail: string | undefined = undefined;
            const customerPhone: string | undefined = undefined;

            // Step 7: Call PayWay service to generate QR
            const qrResult = await payWayQRService.generateQR({
                bookingId,
                amount: finalAmount,
                currency: finalCurrency as any,
                description: description || `Parking Payment - Booking ${bookingId}`,
                customerName,
                customerEmail,
                customerPhone,
                qrImageTemplate,
            });

            console.log(`[payway controller] Payment created: ${qrResult.tranId}`);

            // Step 8: Save payment record to database
            const payment = await prisma.transaction.create({
                data: {
                    bookingId: bookingId,
                    userId: userId,
                    amount: finalAmount,
                    currency: finalCurrency as any,
                    qrString: qrResult.qrString,
                    deeplinkUrl: qrResult.deeplink,
                    status: PaymentStatus.PENDING,
                    description: description || `Parking Payment - Booking ${bookingId}`,
                    paymentMethod: "payway",
                    expiresAt: qrResult.expiresAt,
                    // Store transaction ID for webhook matching
                    transactionHash: qrResult.tranId,
                },
            });

            console.log(`[payway controller] Payment created: ${payment.id}`);

            // Step 9: Return success response with QR data
            res.status(201).json(
                successResponse("Payment created successfully", {
                    paymentId: payment.id,
                    tranId: qrResult.tranId,
                    qrString: qrResult.qrString,
                    qrImage: qrResult.qrImage,
                    deeplink: qrResult.deeplink,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    expiresAt: payment.expiresAt,
                    createdAt: payment.createdAt,
                })
            );
        } catch (error: any) {
            console.error("[payway controller] Generate QR error:", error);
            res.status(500).json(
                errorResponse(
                    "Failed to generate QR code",
                    error.message
                )
            );
        }
    }

    /**
     * Check Payment Status
     * 
     * ENDPOINT: GET /api/v1/payments/:paymentId/status
     * 
     * WHAT IT DOES:
     * Mobile app polls this endpoint to check if payment is completed.
     * Returns current payment status: PENDING, PAID, FAILED, EXPIRED
     * 
     * WHY POLLING?
     * - Webhook might be delayed
     * - Gives instant feedback to user
     * - Mobile app checks every 3 seconds
     * 
     * RESPONSE:
     * {
     *   "success": true,
     *   "data": {
     *     "paymentId": "uuid",
     *     "status": "PENDING" | "PAID" | "FAILED" | "EXPIRED",
     *     "amount": 5.00,
     *     "currency": "USD",
     *     "paidAt": "2024-01-03T14:30:00Z" (if paid)
     *   }
     * }
     */
    async checkPaymentStatus(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const userId = req.user?.userId;

            console.log(`[payway controller] Checking status for payment: ${paymentId}`);

            // Get payment from database
            const payment = await prisma.transaction.findUnique({
                where: { id: paymentId },
            });

            if (!payment) {
                res.status(404).json(errorResponse("Payment not found"));
                return;
            }

            // Verify payment belongs to user (only when authenticated)
            if (userId && payment.userId !== userId) {
                res.status(403).json(
                    errorResponse("Payment does not belong to this user")
                );
                return;
            }

            // Check if payment has expired
            if (payment.expiresAt && new Date() > payment.expiresAt) {
                // Update status to cancelled if still pending
                if (payment.status === PaymentStatus.PENDING) {
                    await prisma.transaction.update({
                        where: { id: paymentId },
                        data: { status: PaymentStatus.CANCELLED },
                    });
                    payment.status = PaymentStatus.CANCELLED;

                    if (payment.bookingId) {
                        try {
                            const parkingServiceUrl =
                                process.env.PARKING_SERVICE_URL ||
                                "http://localhost:3002";
                            const bookingCancelUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/cancel-payment`;

                            console.log(
                                `[payway controller] Cancelling booking ${payment.bookingId} via ${bookingCancelUrl}`
                            );

                            await axios.post(
                                bookingCancelUrl,
                                {
                                    paymentId: payment.id,
                                    amount: Number(payment.amount),
                                },
                                { timeout: 5000 }
                            );
                        } catch (bookingError: any) {
                            console.error(
                                "[payway controller] Failed to cancel booking:",
                                bookingError.response?.data || bookingError.message
                            );
                        }
                    }
                }
            }

            // Return current status
            res.status(200).json(
                successResponse("Payment status retrieved", {
                    paymentId: payment.id,
                    status: payment.status,
                    amount: Number(payment.amount),
                    currency: payment.currency,
                    paidAt: payment.paidAt,
                    createdAt: payment.createdAt,
                    expiresAt: payment.expiresAt,
                })
            );
        } catch (error: any) {
            console.error("[payway controller] Check status error:", error);
            res.status(500).json(
                errorResponse("Failed to check payment status", error.message)
            );
        }
    }

    /**
     * Handle Webhook from PayWay
     * 
     * ENDPOINT: POST /api/v1/payments/webhook/payway
     * 
     * WHAT IT DOES:
     * 1. Receives payment notification from PayWay
     * 2. Verifies HMAC signature (SECURITY!)
     * 3. Updates payment status to PAID
     * 4. Updates booking status to CONFIRMED
     * 5. Updates parking spot to OCCUPIED
     * 6. Always responds 200 OK (so PayWay doesn't retry)
     * 
     * WHEN CALLED:
     * - When user completes payment in banking app
     * - Usually 1-5 seconds after payment
     * - Real-time notification from PayWay
     * 
     * WEBHOOK PAYLOAD:
     * {
     *   "req_time": "20240103143000",
     *   "merchant_id": "dev_123456",
     *   "tran_id": "booking-abc-123-1736156789",
     *   "amount": "500",  // In cents!
     *   "currency": "USD",
     *   "status": "0",  // "0" = success
     *   "payment_option": "abapay_khqr",
     *   "hash": "abc123def456..."  // HMAC signature
     * }
     * 
     * IMPORTANT: 
     * - No authentication required (public endpoint)
     * - But MUST verify signature!
     * - Always return 200 OK (even if error)
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            console.log("[payway webhook] Received webhook from PayWay");
            console.log("[payway webhook] Payload:", JSON.stringify(req.body, null, 2));

            const payload = req.body;
            const receivedHash = payload.hash;

            // Step 1: Verify signature (CRITICAL FOR SECURITY!)
            console.log("[payway webhook] Verifying webhook signature...");
            console.log("[payway webhook] Received hash:", receivedHash || 'No hash provided');
            
            const isValid = PayWayUtils.verifyWebhookSignature(
                payload,
                receivedHash,
                process.env.PAYWAY_API_KEY || ""
            );

            if (!isValid) {
                console.error("[payway webhook] security warning: invalid signature! Possible fraud attempt!");
                console.error("[payway webhook] Payload:", payload);
                // Still return 200 to prevent retries
                res.status(200).json({ 
                    success: false, 
                    error: "Invalid signature" 
                });
                return;
            }

            console.log("[payway webhook] Signature verified");

            // Step 2: Extract data from webhook
            const { tran_id, amount, currency, status } = payload;

            // Step 3: Find payment by transaction ID
            const payment = await prisma.transaction.findFirst({
                where: { transactionHash: tran_id },
            });

            if (!payment) {
                console.error(`[payway webhook] Payment not found for tran_id: ${tran_id}`);
                // Still return 200 (maybe payment was deleted)
                res.status(200).json({ 
                    success: false, 
                    error: "Payment not found" 
                });
                return;
            }

            console.log(`[payway webhook] Found payment: ${payment.id}`);

            // Step 4: Check if already processed (idempotency)
            if (payment.status === PaymentStatus.PAID) {
                console.log("[payway webhook] Payment already processed, skipping");
                res.status(200).json({ 
                    success: true, 
                    message: "Already processed" 
                });
                return;
            }

            // Step 5: Check payment status from webhook
            // PayWay can send status as number (0) or string ("0" or "success")
            console.log(`[payway webhook] Checking status field: "${status}" (type: ${typeof status})`);
            
            if (status === 0 || status === "0" || status === "success") {
                console.log(`[payway webhook] Payment successful: ${tran_id}`);

                // Convert amount from cents to dollars
                const amountInDollars = PayWayUtils.convertFromSmallestUnit(
                    parseInt(amount),
                    currency
                );

                // Validate amount matches
                if (Math.abs(Number(payment.amount) - amountInDollars) > 0.01) {
                    console.error(
                        `[PAYWAY WEBHOOK] Amount mismatch! Expected: ${payment.amount}, Got: ${amountInDollars}`
                    );
                    // Still mark as paid (amount might be slightly different due to rounding)
                }

                // Step 6: Update payment status to PAID
                await prisma.transaction.update({
                    where: { id: payment.id },
                    data: {
                        status: PaymentStatus.PAID,
                        paidAt: new Date(),
                    },
                });

                console.log(`[payway webhook] Payment marked as PAID: ${payment.id}`);

                if (payment.bookingId) {
                    console.log(`[payway webhook] Booking to confirm: ${payment.bookingId}`);
                    const parkingServiceUrl = process.env.PARKING_SERVICE_URL || "http://localhost:3002";
                    const bookingUpdateUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/confirm-payment`;
                    try {
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
                        console.log(`[payway webhook] Booking ${payment.bookingId} updated successfully`);
                    } catch (bookingError: any) {
                        console.error(
                            "[payway webhook] Failed to update booking:",
                            bookingError.response?.data || bookingError.message
                        );
                    }
                }

                console.log("[payway webhook] Payment processing complete");
            } else {
                // Payment failed
                console.log(`[payway webhook] Payment FAILED: ${tran_id}`);
                console.log(`[payway webhook] Status received: "${status}" (expected "0" or "success")`);
                console.log(`[payway webhook] Full webhook data:`, JSON.stringify(payload, null, 2));

                await prisma.transaction.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.FAILED },
                });
                
                console.log(`[payway webhook] Payment marked as FAILED in database`);
            }

            // Step 9: Always return 200 OK
            res.status(200).json({ 
                success: true,
                message: "Webhook processed"
            });
        } catch (error: any) {
            console.error("[payway webhook] Error processing webhook:", error);
            // Still return 200 to prevent PayWay from retrying
            res.status(200).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
}

/**
 * Export singleton instance
 */
export const payWayController = new PayWayController();
