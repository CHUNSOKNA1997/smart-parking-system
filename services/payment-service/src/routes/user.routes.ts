import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/users/{userId}/payments:
 *   get:
 *     summary: Get all payments for a specific user
 *     tags: [Users, Payments]
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/:userId/payments", (req, res) =>
    paymentController.getUserPayments(req, res)
);

export default router;
