import prisma from "../config/prisma.js";
import { BookingStatus } from "@prisma/client";

class BookingModel {
    static computeEndTime(booking) {
        if (booking.endTime) {
            return booking.endTime;
        }
        if (!booking.startTime || booking.durationHours == null) {
            return null;
        }
        const durationHours = Number(booking.durationHours);
        if (Number.isNaN(durationHours)) {
            return null;
        }
        return new Date(
            booking.startTime.getTime() + durationHours * 60 * 60 * 1000
        );
    }
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

    // Release expired reservations
    static async releaseExpiredReservations(minutes = 2) {
        const expiredTime = new Date(Date.now() - minutes * 60 * 1000);

        // Find expired RESERVED bookings
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: BookingStatus.RESERVED,
                createdAt: {
                    lt: expiredTime,
                },
            },
        });

        if (expiredBookings.length === 0) {
            return 0;
        }

        console.log(`[booking] Found ${expiredBookings.length} expired bookings to release`);

        // Process each expired booking
        // We do this individually to ensure all related updates (spot, transactions) happen correctly
        // and to handle any errors for a single booking without stopping the whole batch
        let releasedCount = 0;

        for (const booking of expiredBookings) {
            try {
                await prisma.$transaction(async (tx) => {
                    // 1. Update booking status to CANCELLED
                    await tx.booking.update({
                        where: { id: booking.id },
                        data: {
                            status: BookingStatus.CANCELLED,
                            endTime: new Date()
                        },
                    });

                    // 2. Make spot available again
                    await tx.parkingSpot.update({
                        where: { id: booking.spotId },
                        data: { isAvailable: true },
                    });

                    // 3. Update any associated pending transactions to FAILED
                    // (Though usually they are COMPLETED immediately upon creation in this system, 
                    // this covers cases where they might be PENDING if that status is used)
                    await tx.transaction.updateMany({
                        where: {
                            bookingId: booking.id,
                            status: { not: 'COMPLETED' }
                        },
                        data: { status: 'FAILED' }
                    });
                });

                releasedCount++;
                console.log(`[booking] Auto-released expired booking: ${booking.id}`);
            } catch (error) {
                console.error(`[booking] Failed to release expired booking ${booking.id}:`, error);
            }
        }

        return releasedCount;
    }

    // Complete active bookings whose endTime has passed
    static async completeExpiredActiveBookings() {
        const now = new Date();

        const expiredActiveBookings = await prisma.booking.findMany({
            where: {
                status: BookingStatus.ACTIVE,
                OR: [
                    { endTime: { lt: now } },
                    { endTime: null },
                ],
            },
        });

        if (expiredActiveBookings.length === 0) {
            return 0;
        }

        console.log(
            `[booking] Found ${expiredActiveBookings.length} active bookings to complete`
        );

        let completedCount = 0;

        for (const booking of expiredActiveBookings) {
            try {
                const effectiveEndTime = BookingModel.computeEndTime(booking);
                if (!effectiveEndTime || effectiveEndTime >= now) {
                    continue;
                }

                await prisma.$transaction(async (tx) => {
                    await tx.booking.update({
                        where: { id: booking.id },
                        data: {
                            status: BookingStatus.COMPLETED,
                            endTime: effectiveEndTime,
                        },
                    });

                    await tx.parkingSpot.update({
                        where: { id: booking.spotId },
                        data: { isAvailable: true },
                    });
                });

                completedCount++;
                console.log(
                    `[booking] Auto-completed booking: ${booking.id}`
                );
            } catch (error) {
                console.error(
                    `[booking] Failed to complete booking ${booking.id}:`,
                    error
                );
            }
        }

        return completedCount;
    }
}

export default BookingModel;
