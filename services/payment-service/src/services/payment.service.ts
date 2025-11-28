/**
 * KHQR Payment Service
 * Handles payment creation, verification, and management
 */

import prisma from "../config/prisma.js";
import { khqrBakongService } from "./bakong.service.js";
import { khqrGenerator } from "./khqr-generator.service.js";
import type {
    CreatePaymentRequest,
    CreatePaymentResponse,
    VerifyPaymentResponse,
    KHQRCurrency,
} from "../types/index.js";
import { PaymentStatus } from "@prisma/client";
import { generateMD5 } from "../utils/hash.js";

class PaymentService {
    /**
     * Checks if a payment QR code has expired and updates status if needed.
     *
     * @param payment - Payment record to check
     * @throws Error if payment has expired
     */
    private checkPaymentExpiration(payment: any): void {
        // Skip expiration check for already completed payments
        if (payment.status === PaymentStatus.PAID) {
            return;
        }

        // Check if payment has an expiration time set
        if (payment.expiresAt) {
            const now = new Date();
            const expiresAt = new Date(payment.expiresAt);

            if (now > expiresAt) {
                // Mark payment as expired in database (fire and forget)
                prisma.kHQRPayment
                    .update({
                        where: { id: payment.id },
                        data: { status: PaymentStatus.EXPIRED },
                    })
                    .catch((error) => {
                        console.error(
                            "[PAYMENT] Failed to update expired payment status:",
                            error
                        );
                    });

                throw new Error("Payment QR code has expired");
            }
        }
    }

    /**
     * Creates a new KHQR payment with QR code generation and optional deeplink.
     *
     * @param request - Payment creation details including amount, currency, and booking ID
     * @returns Payment response with QR string, deeplink URL, and MD5 hash
     * @throws Error if KHQR configuration is incomplete
     */
    async createPayment(
        request: CreatePaymentRequest
    ): Promise<CreatePaymentResponse> {
        // Validate that all required KHQR merchant configuration is present
        const configValidation = khqrGenerator.validateConfig();
        if (!configValidation.valid) {
            throw new Error(
                "KHQR configuration incomplete: " +
                    configValidation.errors.join(", ")
            );
        }

        // Calculate QR code expiration time
        const expirationMinutes = parseInt(
            process.env.PAYMENT_QR_EXPIRATION_MINUTES || "15",
            10
        );
        const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

        // Generate KHQR-compliant QR code string using merchant account details
        const qrString = khqrGenerator.generateQRString({
            amount: request.amount,
            currency: request.currency,
            billNumber: request.bookingId || undefined,
        });

        // Attempt to generate deeplink URL via Bakong API (optional - QR code remains functional if this fails)
        let deeplinkUrl = "";
        try {
            const deeplinkResult = await khqrBakongService.generateDeeplink({
                qr: qrString,
                sourceInfo: {
                    appIconUrl: process.env.APP_ICON_URL || "",
                    appName: process.env.APP_NAME || "Smart Parking",
                    appDeepLinkCallback:
                        process.env.APP_DEEPLINK_CALLBACK || "",
                },
            });

            if (deeplinkResult.responseCode === 0 && deeplinkResult.data) {
                deeplinkUrl = deeplinkResult.data.shortLink;
            }
        } catch (error) {
            // Deeplink generation failed (possibly due to CloudFront blocking), but QR code remains functional
            console.warn("[PAYMENT] Deeplink generation failed:", error);
            deeplinkUrl = ""; // QR code will still work for payment processing
        }

        // Generate MD5 hash of QR string for automatic payment verification polling
        const md5Hash = generateMD5(qrString);

        // Persist payment record to database
        const payment = await prisma.kHQRPayment.create({
            data: {
                bookingId: request.bookingId,
                userId: request.userId,
                amount: request.amount,
                currency: request.currency as any,
                qrString: qrString,
                deeplinkUrl: deeplinkUrl || null, // Null if deeplink generation failed
                md5Hash: md5Hash,
                status: PaymentStatus.PENDING,
                description: request.description,
                expiresAt: expiresAt, // Set QR code expiration time
            },
        });

        return {
            paymentId: payment.id,
            qrString: payment.qrString || "",
            deeplinkUrl: payment.deeplinkUrl || "",
            md5: payment.md5Hash || "",
            amount: Number(payment.amount),
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.createdAt,
        };
    }

    /**
     * Checks and auto-verifies payment status using MD5 hash polling.
     * This is the primary method for automatic payment verification without manual hash entry.
     *
     * @param md5 - MD5 hash of the QR code string
     * @returns Verification response with transaction details
     * @throws Error if payment not found or transaction not completed yet
     */
    async checkPaymentByMD5(md5: string): Promise<VerifyPaymentResponse> {
        // Locate payment record using MD5 hash
        const payment = await prisma.kHQRPayment.findUnique({
            where: { md5Hash: md5 },
        });

        if (!payment) {
            throw new Error("Payment not found");
        }

        // Check if payment QR code has expired (before checking if paid)
        this.checkPaymentExpiration(payment);

        // Return cached transaction data if payment is already verified
        if (payment.status === PaymentStatus.PAID) {
            return {
                paymentId: payment.id,
                status: payment.status as any,
                transactionData: {
                    hash: payment.transactionHash || "",
                    fromAccountId: payment.fromAccountId || "",
                    toAccountId: payment.toAccountId || "",
                    currency: payment.currency,
                    amount: Number(payment.amount),
                    description: payment.description || undefined,
                },
                verifiedAt: payment.paidAt || new Date(),
            };
        }

        // Poll Bakong API to check if transaction has been completed
        const transactionResult = await khqrBakongService.checkTransactionByMD5(
            {
                md5,
            }
        );

        // Transaction not found indicates payment is still pending (user hasn't completed payment yet)
        if (transactionResult.responseCode !== 0 || !transactionResult.data) {
            throw new Error("Transaction not found");
        }

        const transactionData = transactionResult.data;

        // Validate transaction integrity by comparing amount and currency
        if (Number(transactionData.amount) !== Number(payment.amount)) {
            throw new Error("Transaction amount does not match payment amount");
        }

        if (transactionData.currency !== payment.currency) {
            throw new Error(
                "Transaction currency does not match payment currency"
            );
        }

        // Mark payment as verified and persist transaction details
        const updatedPayment = await prisma.kHQRPayment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.PAID,
                transactionHash: transactionData.hash,
                fromAccountId: transactionData.fromAccountId,
                toAccountId: transactionData.toAccountId,
                paidAt: new Date(),
            },
        });

        return {
            paymentId: updatedPayment.id,
            status: updatedPayment.status as any,
            transactionData,
            verifiedAt: updatedPayment.paidAt || new Date(),
        };
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

        // Check and update expiration status (but don't throw error, just return the payment)
        if (payment.expiresAt && payment.status === PaymentStatus.PENDING) {
            const now = new Date();
            const expiresAt = new Date(payment.expiresAt);

            if (now > expiresAt && payment.status !== PaymentStatus.EXPIRED) {
                // Update status to expired
                await prisma.kHQRPayment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.EXPIRED },
                });
                payment.status = PaymentStatus.EXPIRED;
            }
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

    /**
     * Retrieves all payments associated with a specific booking.
     *
     * @param bookingId - Booking UUID
     * @returns Array of payment records ordered by creation date (newest first)
     */
    async getPaymentsByBookingId(bookingId: string) {
        return await prisma.kHQRPayment.findMany({
            where: { bookingId },
            orderBy: { createdAt: "desc" },
        });
    }

    /**
     * Generates a QR code image representation of the payment's KHQR string.
     *
     * @param paymentId - Payment UUID
     * @returns Base64-encoded QR code image
     * @throws Error if payment not found or QR string is missing
     */
    async generateQRImage(paymentId: string): Promise<string> {
        const payment = await this.getPaymentById(paymentId);

        if (!payment.qrString) {
            throw new Error("Payment does not have a QR string");
        }

        return await khqrGenerator.generateQRImage(payment.qrString);
    }
}

/**
 * Singleton instance of PaymentService.
 * Use this instance for all payment operations.
 */
export const paymentService = new PaymentService();
export default PaymentService;
