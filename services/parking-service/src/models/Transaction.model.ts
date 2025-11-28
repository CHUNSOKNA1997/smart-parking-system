import prisma from "../config/prisma.js";
import { PaymentMethod, TransactionStatus } from "@prisma/client";

class TransactionModel {
    // Create new transaction
    static async create(transactionData) {
        const { bookingId, userId, amount, paymentMethod, description } =
            transactionData;

        return await prisma.transaction.create({
            data: {
                bookingId,
                userId,
                amount,
                paymentMethod: paymentMethod || PaymentMethod.CASH,
                status: TransactionStatus.COMPLETED,
                description,
            },
        });
    }

    // Find transaction by ID
    static async findById(transactionId) {
        return await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                booking: {
                    include: {
                        spot: true,
                    },
                },
            },
        });
    }

    // Find transactions by user ID
    static async findByUserId(userId, limit = 20) {
        return await prisma.transaction.findMany({
            where: { userId },
            include: {
                booking: {
                    include: {
                        spot: true,
                    },
                },
            },
            orderBy: {
                transactionDate: "desc",
            },
            take: limit,
        });
    }

    // Find transactions by booking ID
    static async findByBookingId(bookingId) {
        return await prisma.transaction.findMany({
            where: { bookingId },
            orderBy: {
                transactionDate: "desc",
            },
        });
    }

    // Get user transaction summary
    static async getUserSummary(userId) {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            select: {
                amount: true,
                status: true,
            },
        });

        const total = transactions.reduce((sum, t) => {
            if (t.status === TransactionStatus.COMPLETED) {
                return sum + Number(t.amount);
            }
            return sum;
        }, 0);

        return {
            totalSpent: total,
            transactionCount: transactions.length,
            completedCount: transactions.filter(
                (t) => t.status === TransactionStatus.COMPLETED
            ).length,
        };
    }

    // Update transaction status
    static async updateStatus(transactionId, status) {
        return await prisma.transaction.update({
            where: { id: transactionId },
            data: { status },
        });
    }
}

export default TransactionModel;
