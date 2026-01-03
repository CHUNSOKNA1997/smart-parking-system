/**
 * Payment Service
 * Handles payment creation, verification, and management
 */

import prisma from "../config/prisma.js";
import type {
    CreatePaymentRequest,
    CreatePaymentResponse,
    VerifyPaymentResponse,
} from "../types/index.js";
import { PaymentStatus } from "@prisma/client";

class PaymentService {
    /**
     * Creates a new payment with ABA PayWay
     *
     * @param request - Payment creation details including amount, currency, and booking ID
     * @returns Payment response with checkout URL or QR details
     * @throws Error if payment method is not supported or ABA service fails
     */
    async createPayment(
        request: CreatePaymentRequest
    ): Promise<CreatePaymentResponse> {
        // Only support ABA PayWay now
        if (request.paymentMethod === "aba") {
            const { abaService } = await import("./aba.service.js");

            // Create a pending payment record first to get an ID
            const payment = await prisma.kHQRPayment.create({
                data: {
                    bookingId: request.bookingId,
                    userId: request.userId,
                    amount: request.amount,
                    currency: request.currency as any,
                    status: PaymentStatus.PENDING,
                    description: request.description,
                    paymentMethod: request.paymentMethod,
                },
            });

            // Call ABA Service
            try {
                // Use purchase endpoint for ABA
                const abaResult = await abaService.createPurchase(request, payment.id);
                const qrString = abaResult.qrString || "";
                const deeplinkUrl = abaResult.deeplink || abaResult.checkoutUrl || "";

                // Update payment with ABA details
                const updatedPayment = await prisma.kHQRPayment.update({
                    where: { id: payment.id },
                    data: {
                        qrString: qrString,
                        deeplinkUrl: deeplinkUrl,
                    },
                });

                return {
                    paymentId: updatedPayment.id,
                    qrString: updatedPayment.qrString || "",
                    deeplinkUrl: updatedPayment.deeplinkUrl || "",
                    amount: Number(updatedPayment.amount),
                    currency: updatedPayment.currency,
                    status: updatedPayment.status,
                    createdAt: updatedPayment.createdAt,
                };
            } catch (error) {
                // If ABA fails, mark payment as failed
                await prisma.kHQRPayment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.FAILED },
                });
                throw error;
            }
        }

        throw new Error("Unsupported payment method. Only 'aba' is supported.");
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
