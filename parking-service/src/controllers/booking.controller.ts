import { Response } from 'express';
import BookingModel from '../models/Booking.model.js';
import ParkingSpotModel from '../models/ParkingSpot.model.js';
import TransactionModel from '../models/Transaction.model.js';
import { generateQRCode } from '../services/qr.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import logger from '../utils/logger.js';
import { AuthRequest } from '../types/index.js';

class BookingController {
  // Create new booking
  static async createBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { spotId, durationHours } = req.body;
      const userId = req.user!.userId;

      // Check if spot exists and is available
      const spot = await ParkingSpotModel.findById(spotId);
      if (!spot) {
        return sendError(res, 404, 'Parking spot not found');
      }

      if (!spot.isAvailable) {
        return sendError(res, 400, 'Parking spot is not available');
      }

      // Check if user already has an active booking
      const activeBooking = await BookingModel.findActiveByUserId(userId);
      if (activeBooking) {
        return sendError(res, 400, 'You already have an active booking');
      }

      // Calculate total price
      const totalPrice = Number(spot.pricePerHour) * Number(durationHours);

      // Generate QR code
      const qrCodeData = {
        bookingId: 'temp', // Will be replaced with actual ID
        spotId,
        userId,
        startTime: new Date().toISOString()
      };
      
      // Create booking
      const booking = await BookingModel.create({
        userId,
        spotId,
        durationHours,
        totalPrice,
        qrCode: null // Generate after booking created
      });

      // Generate QR code with actual booking ID
      qrCodeData.bookingId = booking.id;
      const qrCode = await generateQRCode(qrCodeData);

      // Update booking with QR code
      const updatedBooking = await BookingModel.updateStatus(booking.id, 'reserved');
      updatedBooking.qrCode = qrCode;

      // Update spot availability
      await ParkingSpotModel.updateAvailability(spotId, false);

      // Create transaction record
      await TransactionModel.create({
        bookingId: booking.id,
        userId,
        amount: totalPrice,
        paymentMethod: 'cash',
        description: `Parking booking for spot ${spotId}`
      });

      logger.info(`Booking created: ${booking.id} for user: ${userId}`);

      return sendSuccess(res, 201, 'Booking created successfully', { 
        booking: {
          ...updatedBooking,
          qrCode
        }
      });
    } catch (error) {
      logger.error('Create booking error:', error);
      return sendError(res, 500, 'Failed to create booking', error.message);
    }
  }

  // Get user bookings
  static async getUserBookings(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { status } = req.query;

      const bookings = await BookingModel.findByUserId(userId, status);

      return sendSuccess(res, 200, 'Bookings retrieved successfully', { 
        bookings,
        count: bookings.length
      });
    } catch (error) {
      logger.error('Get user bookings error:', error);
      return sendError(res, 500, 'Failed to retrieve bookings', error.message);
    }
  }

  // Get booking by ID
  static async getBookingById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;

      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, 'Booking not found');
      }

      // Check if booking belongs to user
      if (booking.userId !== userId) {
        return sendError(res, 403, 'Access denied');
      }

      return sendSuccess(res, 200, 'Booking retrieved successfully', { booking });
    } catch (error) {
      logger.error('Get booking by ID error:', error);
      return sendError(res, 500, 'Failed to retrieve booking', error.message);
    }
  }

  // Get active booking for user
  static async getActiveBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;

      const booking = await BookingModel.findActiveByUserId(userId);

      if (!booking) {
        return sendError(res, 404, 'No active booking found');
      }

      return sendSuccess(res, 200, 'Active booking retrieved successfully', { booking });
    } catch (error) {
      logger.error('Get active booking error:', error);
      return sendError(res, 500, 'Failed to retrieve active booking', error.message);
    }
  }

  // Update booking status
  static async updateBookingStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, 'Booking not found');
      }

      // Check if booking belongs to user
      if (booking.userId !== userId) {
        return sendError(res, 403, 'Access denied');
      }

      const endTime = ['completed', 'cancelled'].includes(status) ? new Date() : null;
      const updatedBooking = await BookingModel.updateStatus(bookingId, status, endTime);

      // If booking is completed or cancelled, make spot available
      if (['completed', 'cancelled'].includes(status)) {
        await ParkingSpotModel.updateAvailability(booking.spotId, true);
      }

      logger.info(`Booking ${bookingId} status updated to: ${status}`);

      return sendSuccess(res, 200, 'Booking status updated successfully', { booking: updatedBooking });
    } catch (error) {
      logger.error('Update booking status error:', error);
      return sendError(res, 500, 'Failed to update booking status', error.message);
    }
  }

  // Cancel booking
  static async cancelBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;

      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, 'Booking not found');
      }

      // Check if booking belongs to user
      if (booking.userId !== userId) {
        return sendError(res, 403, 'Access denied');
      }

      // Can only cancel reserved or active bookings
      if (!['reserved', 'active'].includes(booking.status)) {
        return sendError(res, 400, 'Cannot cancel this booking');
      }

      const cancelledBooking = await BookingModel.cancel(bookingId);

      // Make spot available
      await ParkingSpotModel.updateAvailability(booking.spotId, true);

      logger.info(`Booking cancelled: ${bookingId}`);

      return sendSuccess(res, 200, 'Booking cancelled successfully', { booking: cancelledBooking });
    } catch (error) {
      logger.error('Cancel booking error:', error);
      return sendError(res, 500, 'Failed to cancel booking', error.message);
    }
  }

  // Complete booking (end parking)
  static async completeBooking(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.userId;

      const booking = await BookingModel.findById(bookingId);

      if (!booking) {
        return sendError(res, 404, 'Booking not found');
      }

      // Check if booking belongs to user
      if (booking.userId !== userId) {
        return sendError(res, 403, 'Access denied');
      }

      // Can only complete active bookings
      if (booking.status !== 'active') {
        return sendError(res, 400, 'Can only complete active bookings');
      }

      const completedBooking = await BookingModel.complete(bookingId);

      // Make spot available
      await ParkingSpotModel.updateAvailability(booking.spotId, true);

      logger.info(`Booking completed: ${bookingId}`);

      return sendSuccess(res, 200, 'Parking completed successfully', { booking: completedBooking });
    } catch (error) {
      logger.error('Complete booking error:', error);
      return sendError(res, 500, 'Failed to complete booking', error.message);
    }
  }
}

export default BookingController;
