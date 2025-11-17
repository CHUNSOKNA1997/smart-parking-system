import express from "express";
import TransactionController from "../controllers/transaction.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/transactions/me:
 *   get:
 *     summary: Get current user's transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of transactions to return
 *     responses:
 *       200:
 *         description: List of user's transactions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/me", authenticateToken, TransactionController.getUserTransactions);

/**
 * @swagger
 * /api/v1/transactions/me/summary:
 *   get:
 *     summary: Get current user's transaction summary
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction summary (total spent, transaction count, completed count)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    "/me/summary",
    authenticateToken,
    TransactionController.getUserSummary
);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Get specific transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
    "/:transactionId",
    authenticateToken,
    TransactionController.getTransactionById
);

export default router;
