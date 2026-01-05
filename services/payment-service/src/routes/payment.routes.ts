import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { paymentCreationLimiter } from "../middleware/rate-limit.middleware.js";
import { idempotencyMiddleware } from "../middleware/idempotency.middleware.js";
import { createPaymentSchema } from "../validators/payment.validator.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment with PayWay
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [payway]
 *                 default: payway
 *     responses:
 *       201:
 *         description: Payment created successfully
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post(
    "/",
    paymentCreationLimiter,
    idempotencyMiddleware,
    validate(createPaymentSchema),
    (req, res) => paymentController.createPayment(req, res)
);

/**
 * @swagger
 * /api/v1/payments/{id}/confirm:
 *   post:
 *     summary: Manually confirm a payment (for testing/fallback)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     description: Called by mobile app after user returns from payment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       404:
 *         description: Payment not found
 *       403:
 *         description: Access denied
 */
router.post("/:id/confirm", (req, res) =>
    paymentController.confirmPaymentManually(req, res)
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

export default router;
