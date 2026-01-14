/**
 * PayWay Routes
 *
 * This file defines all the HTTP endpoints (URLs) for PayWay integration.
 * It connects URLs to controller methods.
 *
 * ENDPOINTS:
 * - GET /api/v1/payments/:paymentId/status  → Check payment status
 * - POST /api/v1/payments/webhook/payway    → Receive webhook
 */

import { Router } from "express";
import { payWayController } from "../controllers/payway.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { paymentIdSchema } from "../validators/payway.validator.js";

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
    validate(paymentIdSchema, "params"),
    (req, res) => payWayController.checkPaymentStatus(req, res)
);

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
