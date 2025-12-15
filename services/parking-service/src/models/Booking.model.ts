import prisma from "../config/prisma.js";
import { BookingStatus } from "@prisma/client";

class BookingModel {
    // Create new booking
    static async create(bookingData) {
        const { userId, spotId, durationHours, totalPrice, qrCode } =
            bookingData;

        return await prisma.booking.create({
            data: {
                userId,
                spotId,
                durationHours,
                totalPrice,
                qrCode,
                status: BookingStatus.RESERVED,
                startTime: new Date(),
            },
            include: {
                spot: true,
            },
        });
    }

    // Find booking by ID
    static async findById(bookingId) {
        return await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                spot: true,
            },
        });
    }

    // Find bookings by user ID with pagination
    static async findByUserId(userId: string, options: any = {}) {
        const {
            status = null,
            page = 1,
            limit = 20,
            sortField = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        // Calculate offset for pagination
        const skip = (page - 1) * limit;

        // Build orderBy object
        const orderBy: any = {};
        orderBy[sortField] = sortOrder;

        // Get total count for pagination metadata
        const total = await prisma.booking.count({ where });

        // Get paginated results
        const bookings = await prisma.booking.findMany({
            where,
            include: {
                spot: true,
                transactions: true,
            },
            orderBy,
            skip,
            take: limit,
        });

        return {
            bookings,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            }
        };
    }

    // Find active booking by user
    static async findActiveByUserId(userId) {
        return await prisma.booking.findFirst({
            where: {
                userId,
                status: {
                    in: [BookingStatus.RESERVED, BookingStatus.ACTIVE],
                },
            },
            include: {
                spot: true,
            },
        });
    }

    // Find active booking by spot
    static async findActiveBySpotId(spotId) {
        return await prisma.booking.findFirst({
            where: {
                spotId,
                status: {
                    in: [BookingStatus.RESERVED, BookingStatus.ACTIVE],
                },
            },
        });
    }

    // Update booking status
    static async updateStatus(bookingId, status, endTime = null) {
        const data: any = { status };
        if (endTime) {
            data.endTime = endTime;
        }

        return await prisma.booking.update({
            where: { id: bookingId },
            data,
            include: {
                spot: true,
            },
        });
    }

    // Cancel booking
    static async cancel(bookingId) {
        return await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: BookingStatus.CANCELLED,
                endTime: new Date(),
            },
        });
    }

    // Complete booking
    static async complete(bookingId) {
        return await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: BookingStatus.COMPLETED,
                endTime: new Date(),
            },
        });
    }

    // Get user booking history
    static async getUserHistory(userId, limit = 10) {
        return await prisma.booking.findMany({
            where: { userId },
            include: {
                spot: true,
                transactions: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
        });
    }

    // Delete booking
    static async delete(bookingId) {
        return await prisma.booking.delete({
            where: { id: bookingId },
        });
    }
}

export default BookingModel;
