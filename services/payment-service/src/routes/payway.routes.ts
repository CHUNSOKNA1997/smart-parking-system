/**
 * PayWay Routes
 *
 * This file defines all the HTTP endpoints (URLs) for PayWay integration.
 * It connects URLs to controller methods.
 *
 * ENDPOINTS:
 * - POST /api/v1/payments/payway/qr         → Generate QR code (protected)
 * - GET /api/v1/payments/:paymentId/status  → Check payment status (protected)
 * - POST /api/v1/payments/webhook/payway    → Receive webhook (public)
 *
 * "Protected" means user must be logged in (JWT token required)
 * "Public" means anyone can call it (PayWay doesn't have JWT token!)
 */

import { Router } from "express";
import { payWayController } from "../controllers/payway.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { paymentCreationLimiter } from "../middleware/rate-limit.middleware.js";
import {
    generateQRSchema,
    paymentIdSchema,
} from "../validators/payway.validator.js";

// Create Express router
const router = Router();

/**
 * =============================================================================
 * PUBLIC ROUTES (No Authentication Required)
 * =============================================================================
 *
 * These routes can be called without JWT token.
 * PayWay calls these endpoints directly from their servers.
 */

/**
 * Check Payment Status (Polling) - Public
 *
 * GET /api/v1/payments/payway/:paymentId/status
 *
 * NOTE: In dev, we allow public polling to avoid JWT issues in mobile polling.
 * TODO: tighten security in production (e.g., signed token or short-lived token).
 */
router.get(
    "/:paymentId/status",
    validate(paymentIdSchema),
    (req, res) => payWayController.checkPaymentStatus(req, res)
);

/**
 * =============================================================================
 * PROTECTED ROUTES (Require Authentication)
 * =============================================================================
 *
 * All routes below this line require JWT token in Authorization header:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * If token is missing or invalid → 401 Unauthorized
 */
router.use(authMiddleware);

/**
 * Generate QR Code for Payment
 *
 * POST /api/v1/payments/payway/qr
 *
 * REQUEST:
 * Headers:
 *   Authorization: Bearer <jwt-token>
 *   Content-Type: application/json
 * Body:
 *   {
 *     "bookingId": "abc-123",
 *     "amount": 5.00,
 *     "currency": "USD",
 *     "description": "Parking Spot A1 - 2 hours"
 *   }
 *
 * RESPONSE (201 Created):
 *   {
 *     "success": true,
 *     "message": "qr code generated successfully",
 *     "data": {
 *       "paymentId": "uuid",
 *       "tranId": "booking-abc-123-1736156789",
 *       "qrString": "00020101021...",
 *       "qrImage": "data:image/png;base64,...",
 *       "deeplinkUrl": "abapay://qr?code=...",
 *       "amount": 5.00,
 *       "currency": "USD",
 *       "status": "PENDING",
 *       "expiresAt": "2024-01-03T14:45:00Z"
 *     }
 *   }
 *
 * SWAGGER DOCUMENTATION:
 * @swagger
 * /api/v1/payments/payway/qr:
 *   post:
 *     summary: Generate QR code for payment
 *     tags: [PayWay]
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
 *               - currency
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: Parking booking ID
 *                 example: "abc-123"
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *                 example: 5.00
 *               currency:
 *                 type: string
 *                 enum: [USD, KHR]
 *                 description: Payment currency
 *                 example: "USD"
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Parking Spot A1 - 2 hours"
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *       400:
 *         description: Invalid request (missing fields, invalid amount, etc.)
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post(
    "/qr",
    paymentCreationLimiter, // Prevent spam (max 10 requests per minute)
    validate(generateQRSchema), // Validate request body
    (req, res) => payWayController.generateQR(req, res)
);

/**
 * Check Payment Status (Polling)
 *
 * GET /api/v1/payments/:paymentId/status
 *
 * REQUEST:
 * Headers:
 *   Authorization: Bearer <jwt-token>
 * Parameters:
 *   paymentId: UUID of the payment
 *
 * RESPONSE (200 OK):
 *   {
 *     "success": true,
 *     "message": "Payment status retrieved",
 *     "data": {
 *       "paymentId": "uuid",
 *       "status": "PENDING" | "PAID" | "FAILED" | "EXPIRED",
 *       "amount": 5.00,
 *       "currency": "USD",
 *       "paidAt": "2024-01-03T14:30:00Z",
 *       "createdAt": "2024-01-03T14:15:00Z",
 *       "expiresAt": "2024-01-03T14:30:00Z"
 *     }
 *   }
 *
 * USAGE:
 * Mobile app calls this every 3 seconds to check if payment is completed.
 * Stops polling when status changes to PAID, FAILED, or EXPIRED.
 *
 * SWAGGER DOCUMENTATION:
 * @swagger
 * /api/v1/payments/{paymentId}/status:
 *   get:
 *     summary: Check payment status
 *     tags: [PayWay]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Access denied (payment doesn't belong to user)
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
// (status polling route moved to public section above)

/**
 * Webhook - Payment Notification from PayWay
 *
 * POST /api/v1/payments/webhook/payway
 *
 * ⚠️ IMPORTANT: This is a PUBLIC endpoint!
 * - No authentication required (PayWay doesn't have JWT token)
 * - BUT signature verification is MANDATORY for security
 * - Always returns 200 OK (even on error) to prevent retries
 *
 * REQUEST:
 * Headers:
 *   Content-Type: application/json
 * Body:
 *   {
 *     "req_time": "20240103143000",
 *     "merchant_id": "dev_123456",
 *     "tran_id": "booking-abc-123-1736156789",
 *     "amount": "500",
 *     "currency": "USD",
 *     "status": "0",
 *     "payment_option": "abapay_khqr",
 *     "hash": "abc123def456..."
 *   }
 *
 * RESPONSE (200 OK):
 *   {
 *     "success": true,
 *     "message": "Webhook processed"
 *   }
 *
 * WHEN CALLED:
 * - When user completes payment in banking app
 * - Usually 1-5 seconds after payment
 * - PayWay sends this automatically
 *
 * WHAT IT DOES:
 * 1. Verifies HMAC signature (security!)
 * 2. Finds payment by transaction ID
 * 3. Updates payment status to PAID
 * 4. Updates booking status to CONFIRMED
 * 5. Updates parking spot to OCCUPIED
 * 6. Returns 200 OK
 *
 * SECURITY:
 * - Signature verification prevents fake webhooks
 * - Only PayWay knows the secret key
 * - If signature doesn't match → Reject!
 *
 * IDEMPOTENCY:
 * - If webhook is sent twice, only processes once
 * - Checks if payment is already PAID
 *
 * TESTING:
 * Use ngrok to expose local server:
 *   ngrok http 3003
 *   Copy URL: https://abc123.ngrok.io
 *   Add to PayWay dashboard: https://abc123.ngrok.io/api/v1/payments/webhook/payway
 *
 * SWAGGER DOCUMENTATION:
 * @swagger
 * /api/v1/payments/webhook/payway:
 *   post:
 *     summary: Receive payment notification from PayWay
 *     tags: [PayWay]
 *     description: This endpoint is called by PayWay when payment is completed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               req_time:
 *                 type: string
 *                 example: "20240103143000"
 *               merchant_id:
 *                 type: string
 *                 example: "dev_123456"
 *               tran_id:
 *                 type: string
 *                 example: "booking-abc-123-1736156789"
 *               amount:
 *                 type: string
 *                 example: "500"
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               status:
 *                 type: string
 *                 example: "0"
 *               payment_option:
 *                 type: string
 *                 example: "abapay_khqr"
 *               hash:
 *                 type: string
 *                 example: "abc123def456..."
 *     responses:
 *       200:
 *         description: Webhook processed (always returns 200)
 */

// Create a new router for webhook (no auth middleware)
const webhookRouter = Router();

webhookRouter.post("/webhook/payway", (req, res) =>
    payWayController.handleWebhook(req, res)
);

/**
 * Export both routers
 *
 * Main app will mount them:
 * app.use('/api/v1/payments/payway', router);      // Protected routes
 * app.use('/api/v1/payments', webhookRouter);      // Webhook route
 */
export { router as payWayRoutes, webhookRouter as webhookRoutes };
export default router;
