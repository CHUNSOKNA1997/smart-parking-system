import express from "express";
import BookingController from "../controllers/booking.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { bookingCreationLimiter } from "../middleware/rate-limit.middleware.js";
import {
    createBookingSchema,
    updateBookingStatusSchema,
} from "../validators/booking.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Create a new parking booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spotId
 *               - startTime
 *             properties:
 *               spotId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Invalid input or spot unavailable
 *       401:
 *         description: Unauthorized
 */
router.post(
    "/",
    authenticateToken,
    bookingCreationLimiter,
    validate(createBookingSchema),
    BookingController.createBooking
);

/**
 * @swagger
 * /api/v1/bookings/me:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticateToken, BookingController.getUserBookings);

/**
 * @swagger
 * /api/v1/bookings/me/active:
 *   get:
 *     summary: Get current user's active booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active booking details
 *       404:
 *         description: No active booking found
 *       401:
 *         description: Unauthorized
 */
router.get("/me/active", authenticateToken, BookingController.getActiveBooking);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}:
 *   get:
 *     summary: Get specific booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:bookingId", authenticateToken, BookingController.getBookingById);

/**
 * @swagger
 * /api/v1/bookings/{bookingId}:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [RESERVED, ACTIVE, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
    "/:bookingId",
    authenticateToken,
    validate(updateBookingStatusSchema),
    BookingController.updateBookingStatus
);

export default router;
