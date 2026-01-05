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
     * @param request - Payment creation details including amount, currency, and booking ID(s)
     * @returns Payment response with QR code and deep link
     * @throws Error if payment method is not supported or PayWay service fails
     */
    async createPayment(
        request: CreatePaymentRequest
    ): Promise<CreatePaymentResponse> {
        // Only support PayWay QR now
        if (request.paymentMethod === "payway") {
            // Normalize bookings - support both legacy single booking and new array
            const bookings = request.bookings || 
                (request.bookingId ? [{ 
                    bookingId: request.bookingId, 
                    amount: request.amount,
                    description: request.description 
                }] : []);

            if (bookings.length === 0) {
                throw new Error("At least one booking is required");
            }

            // Validate total amount matches sum of booking amounts
            const totalBookingAmount = bookings.reduce((sum, b) => sum + b.amount, 0);
            if (Math.abs(totalBookingAmount - request.amount) > 0.01) {
                throw new Error(
                    `Total amount (${request.amount}) does not match sum of booking amounts (${totalBookingAmount})`
                );
            }

            // Generate QR code via PayWay
            const qrResult = await payWayQRService.generateQR({
                bookingId: bookings[0].bookingId, // Legacy: use first booking for tracking
                amount: request.amount,
                currency: request.currency,
                description: request.description || 
                    `Payment for ${bookings.length} booking${bookings.length > 1 ? 's' : ''}`,
            });

            // Create payment record with bookings in a transaction
            const payment = await prisma.$transaction(async (tx) => {
                // Create payment
                const newPayment = await tx.kHQRPayment.create({
                    data: {
                        bookingId: bookings[0].bookingId, // Legacy field: store first booking
                        userId: request.userId,
                        amount: request.amount,
                        currency: request.currency as any,
                        qrString: qrResult.qrString,
                        deeplinkUrl: qrResult.deeplink,
                        status: PaymentStatus.PENDING,
                        description: request.description,
                        paymentMethod: "payway",
                        expiresAt: qrResult.expiresAt,
                        transactionHash: qrResult.tranId,
                    },
                });

                // Create junction records for each booking
                await tx.paymentBooking.createMany({
                    data: bookings.map((booking) => ({
                        paymentId: newPayment.id,
                        bookingId: booking.bookingId,
                        amount: booking.amount,
                    })),
                });

                // Return payment with bookings
                return await tx.kHQRPayment.findUnique({
                    where: { id: newPayment.id },
                    include: {
                        bookings: true,
                    },
                });
            });

            if (!payment) {
                throw new Error("Failed to create payment");
            }

            return {
                paymentId: payment.id,
                qrString: payment.qrString || "",
                qrImage: qrResult.qrImage,
                deeplinkUrl: payment.deeplinkUrl || "",
                amount: Number(payment.amount),
                currency: payment.currency,
                status: payment.status,
                bookings: payment.bookings.map((b) => ({
                    bookingId: b.bookingId,
                    amount: Number(b.amount),
                })),
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
     * @returns Payment record with bookings
     * @throws Error if payment not found
     */
    async getPaymentById(paymentId: string) {
        const payment = await prisma.kHQRPayment.findUnique({
            where: { id: paymentId },
            include: {
                bookings: true,
            },
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
            include: {
                bookings: true,
            },
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
