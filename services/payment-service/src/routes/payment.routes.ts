import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { abaCallbackController } from "../controllers/aba-callback.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
    paymentCreationLimiter,
} from "../middleware/rate-limit.middleware.js";
import {
    createPaymentSchema,
} from "../validators/payment.validator.js";

const router = Router();

// ABA Callback routes (NO auth middleware - called by ABA servers)
/**
 * @swagger
 * /api/v1/payments/aba-callback:
 *   post:
 *     summary: Handle ABA PayWay callback
 *     tags: [Payments, ABA]
 *     description: Webhook endpoint called by ABA PayWay after payment completion
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               tran_id:
 *                 type: string
 *               status:
 *                 type: string
 *               amount:
 *                 type: string
 *               hash:
 *                 type: string
 *     responses:
 *       200:
 *         description: Callback processed successfully
 *       400:
 *         description: Invalid hash or bad request
 */
router.post("/aba-callback", (req, res) =>
    abaCallbackController.handleCallback(req, res)
);

// All routes below require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment with ABA PayWay
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
 *                 enum: [aba]
 *                 default: aba
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
 *     description: Called by mobile app after user returns from ABA payment
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
