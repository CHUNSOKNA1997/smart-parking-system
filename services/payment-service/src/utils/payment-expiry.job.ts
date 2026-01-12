import axios from "axios";
import { PaymentStatus } from "@prisma/client";
import prisma from "../config/prisma.js";

const DEFAULT_INTERVAL_MS = 30_000;

export const startPaymentExpiryJob = (): void => {
    const intervalMs = parseInt(
        process.env.PAYMENT_EXPIRY_JOB_INTERVAL_MS || `${DEFAULT_INTERVAL_MS}`,
        10
    );

    let isRunning = false;

    setInterval(async () => {
        if (isRunning) {
            return;
        }
        isRunning = true;

        try {
            const now = new Date();
            const expiredPayments = await prisma.transaction.findMany({
                where: {
                    status: PaymentStatus.PENDING,
                    expiresAt: { lt: now },
                },
            });

            if (expiredPayments.length === 0) {
                return;
            }

            const parkingServiceUrl =
                process.env.PARKING_SERVICE_URL || "http://localhost:3002";

            for (const payment of expiredPayments) {
                await prisma.transaction.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.CANCELLED },
                });

                console.log(
                    `[payment-expiry] Payment ${payment.id} expired and marked CANCELLED`
                );

                if (payment.bookingId) {
                    try {
                        const bookingCancelUrl = `${parkingServiceUrl}/api/v1/bookings/${payment.bookingId}/cancel-payment`;
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
                            "[payment-expiry] Failed to cancel booking:",
                            bookingError.response?.data || bookingError.message
                        );
                    }
                }
            }
        } catch (error: any) {
            console.error("[payment-expiry] Job error:", error.message || error);
        } finally {
            isRunning = false;
        }
    }, intervalMs);
};
