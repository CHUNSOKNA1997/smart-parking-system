import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { abaCallbackController } from "../controllers/aba-callback.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
    paymentCreationLimiter,
    paymentVerificationLimiter,
} from "../middleware/rate-limit.middleware.js";
import {
    createPaymentSchema,
    verifyPaymentSchema,
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [khqr, aba, cash, card]
 *                 default: khqr
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
 * /api/v1/payments/verifications:
 *   post:
 *     summary: Verify payment status using MD5 hash (automatic polling)
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
 *         description: Payment verified successfully
 *       400:
 *         description: Payment not found or not completed
 */
router.post(
    "/verifications",
    paymentVerificationLimiter,
    validate(verifyPaymentSchema),
    (req, res) => paymentController.verifyPayment(req, res)
);

/**
 * @swagger
 * /api/v1/payments/{id}/qr-image:
 *   get:
 *     summary: Get QR code PNG image for a payment
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
 *         description: Returns image/png
 *       404:
 *         description: Payment or QR not found
 */
router.get("/:id/qr-image", (req, res) =>
    paymentController.getPaymentQrImage(req, res)
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
