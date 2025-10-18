import prisma from '../config/prisma.js';

class BookingModel {
  // Create new booking
  static async create(bookingData) {
    const { userId, spotId, durationHours, totalPrice, qrCode } = bookingData;

    return await prisma.booking.create({
      data: {
        userId,
        spotId,
        durationHours,
        totalPrice,
        qrCode,
        status: 'reserved',
        startTime: new Date()
      },
      include: {
        spot: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  // Find booking by ID
  static async findById(bookingId) {
    return await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        spot: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  // Find bookings by user ID
  static async findByUserId(userId, status = null) {
    const where = { userId };
    if (status) {
      where.status = status;
    }

    return await prisma.booking.findMany({
      where,
      include: {
        spot: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Find active booking by user
  static async findActiveByUserId(userId) {
    return await prisma.booking.findFirst({
      where: {
        userId,
        status: {
          in: ['reserved', 'active']
        }
      },
      include: {
        spot: true
      }
    });
  }

  // Find active booking by spot
  static async findActiveBySpotId(spotId) {
    return await prisma.booking.findFirst({
      where: {
        spotId,
        status: {
          in: ['reserved', 'active']
        }
      }
    });
  }

  // Update booking status
  static async updateStatus(bookingId, status, endTime = null) {
    const data = { status };
    if (endTime) {
      data.endTime = endTime;
    }

    return await prisma.booking.update({
      where: { id: bookingId },
      data,
      include: {
        spot: true
      }
    });
  }

  // Cancel booking
  static async cancel(bookingId) {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        endTime: new Date()
      }
    });
  }

  // Complete booking
  static async complete(bookingId) {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        endTime: new Date()
      }
    });
  }

  // Get user booking history
  static async getUserHistory(userId, limit = 10) {
    return await prisma.booking.findMany({
      where: { userId },
      include: {
        spot: true,
        transactions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  // Delete booking
  static async delete(bookingId) {
    return await prisma.booking.delete({
      where: { id: bookingId }
    });
  }
}

export default BookingModel;
