import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new KHQR payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - amount
 *             properties:
 *               bookingId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [USD, KHR]
 *                 default: USD
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post("/", (req, res) => paymentController.createPayment(req, res));

/**
 * @swagger
 * /api/v1/payments/check-payment:
 *   post:
 *     summary: Check payment status using MD5 hash (automatic polling)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - md5
 *             properties:
 *               md5:
 *                 type: string
 *                 description: MD5 hash of the QR code string
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Payment not found or not completed
 */
router.post("/check-payment", (req, res) =>
    paymentController.checkPayment(req, res)
);

/**
 * @swagger
 * /api/v1/payments/user/{userId}:
 *   get:
 *     summary: Get all payments for a specific user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/user/:userId", (req, res) =>
    paymentController.getUserPayments(req, res)
);

/**
 * @swagger
 * /api/v1/payments/booking/{bookingId}:
 *   get:
 *     summary: Get all payments for a specific booking
 *     tags: [Payments]
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
 *         description: Payments retrieved successfully
 *       500:
 *         description: Server error
 */
router.get("/booking/:bookingId", (req, res) =>
    paymentController.getBookingPayments(req, res)
);

/**
 * @swagger
 * /api/v1/payments/{id}/qr-image:
 *   get:
 *     summary: Generate QR code image for a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: QR image generated successfully
 *       500:
 *         description: Server error
 */
router.get("/:id/qr-image", (req, res) =>
    paymentController.getQRImage(req, res)
);

/**
 * @swagger
 * /api/v1/payments/{id}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *       404:
 *         description: Payment not found
 */
router.get("/:id", (req, res) => paymentController.getPaymentById(req, res));

export default router;
