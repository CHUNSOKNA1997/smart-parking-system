/**
 * Payment Service
 * Handles payment creation, verification, and management
 */

import prisma from "../config/prisma.js";
import type {
    CreatePaymentRequest,
    CreatePaymentResponse,
} from "../types/index.js";
import { PaymentStatus } from "@prisma/client";
import { payWayQRService } from "./payway.service.js";

class PaymentService {
    /**
     * Creates a new payment with PayWay QR
     *
     * @param request - Payment creation details including amount, currency, and booking ID
     * @returns Payment response with QR code and deep link
     * @throws Error if payment method is not supported or PayWay service fails
     */
    async createPayment(
        request: CreatePaymentRequest
    ): Promise<CreatePaymentResponse> {
        // Only support PayWay QR now
        if (request.paymentMethod === "payway") {
            // Generate QR code via PayWay
            const qrResult = await payWayQRService.generateQR({
                bookingId: request.bookingId || "",
                amount: request.amount,
                currency: request.currency,
                description: request.description || `Parking Payment`,
            });

            // Create payment record in database
            const payment = await prisma.kHQRPayment.create({
                data: {
                    bookingId: request.bookingId,
                    userId: request.userId,
                    amount: request.amount,
                    currency: request.currency as any,
                    qrString: qrResult.qrString, // Store KHQR string
                    deeplinkUrl: qrResult.deeplink, // Store ABA Pay deeplink
                    status: PaymentStatus.PENDING,
                    description: request.description,
                    paymentMethod: "payway",
                    expiresAt: qrResult.expiresAt,
                    transactionHash: qrResult.tranId,
                },
            });

            return {
                paymentId: payment.id,
                qrString: payment.qrString || "",
                qrImage: qrResult.qrImage, // Pass through QR image
                deeplinkUrl: payment.deeplinkUrl || "",
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
                createdAt: payment.createdAt,
            };
        }

        throw new Error(
            "Unsupported payment method. Only 'payway' is supported."
        );
    }

    /**
     * Retrieves a payment record by its unique identifier.
     *
     * @param paymentId - Payment UUID
     * @returns Payment record
     * @throws Error if payment not found
     */
    async getPaymentById(paymentId: string) {
        const payment = await prisma.kHQRPayment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new Error("Payment not found");
        }

        return payment;
    }

    /**
     * Retrieves all payments associated with a specific user.
     *
     * @param userId - User UUID
     * @returns Array of payment records ordered by creation date (newest first)
     */
    async getPaymentsByUserId(userId: string) {
        return await prisma.kHQRPayment.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
}

/**
 * Singleton instance of PaymentService.
 * Use this instance for all payment operations.
 */
export const paymentService = new PaymentService();
export default PaymentService;
