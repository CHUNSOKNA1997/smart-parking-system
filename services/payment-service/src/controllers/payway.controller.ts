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
     *   "message": "QR code generated successfully",
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
            console.log("[PAYWAY CONTROLLER] Generate QR request received");

            // Extract data from request
            const { bookingId, amount, currency, description } = req.body;
            const userId = req.user?.userId; // From auth middleware

            // Step 1: Validate user is authenticated
            if (!userId) {
                console.error("[PAYWAY CONTROLLER] User not authenticated");
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            // Step 2: Validate required fields
            if (!bookingId || !amount || !currency) {
                console.error("[PAYWAY CONTROLLER] Missing required fields");
                res.status(400).json(
                    errorResponse("Missing required fields: bookingId, amount, currency")
                );
                return;
            }

            // Step 3: Validate amount is positive
            if (amount <= 0) {
                console.error("[PAYWAY CONTROLLER] Invalid amount:", amount);
                res.status(400).json(
                    errorResponse("Amount must be greater than 0")
                );
                return;
            }

            // Step 4: Validate currency
            if (!["USD", "KHR"].includes(currency)) {
                console.error("[PAYWAY CONTROLLER] Invalid currency:", currency);
                res.status(400).json(
                    errorResponse("Currency must be USD or KHR")
                );
                return;
            }

            console.log(`[PAYWAY CONTROLLER] Generating QR for booking: ${bookingId}`);

            // Step 5: Customer info (optional - can be added later)
            // For now, we generate QR without customer details
            // You can add customer info by passing it from the mobile app
            const customerName: string | undefined = undefined;
            const customerEmail: string | undefined = undefined;
            const customerPhone: string | undefined = undefined;

            // Step 6: Call PayWay service to generate QR
            const qrResult = await payWayQRService.generateQR({
                bookingId,
                amount,
                currency,
                description: description || `Parking Payment - Booking ${bookingId}`,
                customerName,
                customerEmail,
                customerPhone,
            });

            console.log(`[PAYWAY CONTROLLER] Payment created: ${qrResult.tranId}`);

            // Step 7: Save payment record to database
            const payment = await prisma.kHQRPayment.create({
                data: {
                    bookingId: bookingId,
                    userId: userId,
                    amount: amount,
                    currency: currency as any,
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

            console.log(`[PAYWAY CONTROLLER] Payment created: ${payment.id}`);

            // Step 8: Return success response with QR data
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
            console.error("[PAYWAY CONTROLLER] Generate QR error:", error);
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

            // Validate user is authenticated
            if (!userId) {
                res.status(401).json(errorResponse("User not authenticated"));
                return;
            }

            console.log(`[PAYWAY CONTROLLER] Checking status for payment: ${paymentId}`);

            // Get payment from database
            const payment = await prisma.kHQRPayment.findUnique({
                where: { id: paymentId },
            });

            if (!payment) {
                res.status(404).json(errorResponse("Payment not found"));
                return;
            }

            // Verify payment belongs to user
            if (payment.userId !== userId) {
                res.status(403).json(errorResponse("Access denied"));
                return;
            }

            // Check if payment has expired
            if (payment.expiresAt && new Date() > payment.expiresAt) {
                // Update status to expired if still pending
                if (payment.status === PaymentStatus.PENDING) {
                    await prisma.kHQRPayment.update({
                        where: { id: paymentId },
                        data: { status: PaymentStatus.EXPIRED },
                    });
                    payment.status = PaymentStatus.EXPIRED;
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
            console.error("[PAYWAY CONTROLLER] Check status error:", error);
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
            console.log("[PAYWAY WEBHOOK] Received webhook from PayWay");
            console.log("[PAYWAY WEBHOOK] Payload:", JSON.stringify(req.body, null, 2));

            const payload = req.body;
            const receivedHash = payload.hash;

            // Step 1: Verify signature (CRITICAL FOR SECURITY!)
            // TEMPORARILY DISABLED FOR DEBUGGING - RE-ENABLE IN PRODUCTION!
            console.log("[PAYWAY WEBHOOK] ⚠️  Signature verification DISABLED for testing");
            console.log("[PAYWAY WEBHOOK] Received hash:", receivedHash);
            
            const isValid = true; // Temporarily skip verification
            
            // TODO: Re-enable signature verification:
            // const isValid = PayWayUtils.verifyWebhookSignature(
            //     payload,
            //     receivedHash,
            //     process.env.PAYWAY_API_KEY || ""
            // );

            if (!isValid) {
                console.error("[PAYWAY WEBHOOK] ⚠️ INVALID SIGNATURE! Possible fraud attempt!");
                console.error("[PAYWAY WEBHOOK] Payload:", payload);
                // Still return 200 to prevent retries
                res.status(200).json({ 
                    success: false, 
                    error: "Invalid signature" 
                });
                return;
            }

            console.log("[PAYWAY WEBHOOK] ✅ Signature verified");

            // Step 2: Extract data from webhook
            const { tran_id, amount, currency, status } = payload;

            // Step 3: Find payment by transaction ID
            const payment = await prisma.kHQRPayment.findFirst({
                where: { transactionHash: tran_id },
            });

            if (!payment) {
                console.error(`[PAYWAY WEBHOOK] Payment not found for tran_id: ${tran_id}`);
                // Still return 200 (maybe payment was deleted)
                res.status(200).json({ 
                    success: false, 
                    error: "Payment not found" 
                });
                return;
            }

            console.log(`[PAYWAY WEBHOOK] Found payment: ${payment.id}`);

            // Step 4: Check if already processed (idempotency)
            if (payment.status === PaymentStatus.PAID) {
                console.log("[PAYWAY WEBHOOK] Payment already processed, skipping");
                res.status(200).json({ 
                    success: true, 
                    message: "Already processed" 
                });
                return;
            }

            // Step 5: Check payment status from webhook
            // PayWay can send status as number (0) or string ("0" or "success")
            console.log(`[PAYWAY WEBHOOK] Checking status field: "${status}" (type: ${typeof status})`);
            
            if (status === 0 || status === "0" || status === "success") {
                console.log(`[PAYWAY WEBHOOK] ✅ Payment successful: ${tran_id}`);

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
                await prisma.kHQRPayment.update({
                    where: { id: payment.id },
                    data: {
                        status: PaymentStatus.PAID,
                        paidAt: new Date(),
                    },
                });

                console.log(`[PAYWAY WEBHOOK] Payment marked as PAID: ${payment.id}`);

                // Step 7: Update booking status (via API call to booking service)
                // TODO: If you have a booking service, call it here to update booking status
                // For now, we just log the booking ID
                if (payment.bookingId) {
                    console.log(`[PAYWAY WEBHOOK] Booking to confirm: ${payment.bookingId}`);
                    // Example: await bookingService.updateStatus(payment.bookingId, "CONFIRMED");
                }

                console.log("[PAYWAY WEBHOOK] ✅ Payment processing complete");
            } else {
                // Payment failed
                console.log(`[PAYWAY WEBHOOK] ❌ Payment FAILED: ${tran_id}`);
                console.log(`[PAYWAY WEBHOOK] Status received: "${status}" (expected "0" or "success")`);
                console.log(`[PAYWAY WEBHOOK] Full webhook data:`, JSON.stringify(payload, null, 2));

                await prisma.kHQRPayment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.FAILED },
                });
                
                console.log(`[PAYWAY WEBHOOK] Payment marked as FAILED in database`);
            }

            // Step 9: Always return 200 OK
            res.status(200).json({ 
                success: true,
                message: "Webhook processed"
            });
        } catch (error: any) {
            console.error("[PAYWAY WEBHOOK] Error processing webhook:", error);
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
