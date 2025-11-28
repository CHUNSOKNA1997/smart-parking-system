import express from "express";
import TransactionController from "../controllers/transaction.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// All transaction routes require authentication

/**
 * @swagger
 * /api/v1/transactions/me:
 *   get:
 *     summary: Get current user's transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user transactions
 *       401:
 *         description: Unauthorized
 */
router.get(
	"/me",
	authenticateToken,
	TransactionController.getUserTransactions
);

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
 *         description: Transaction summary
 *       401:
 *         description: Unauthorized
 */
router.get("/me/summary", authenticateToken, TransactionController.getUserSummary);

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the transaction
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */
router.get(
	"/:transactionId",
	authenticateToken,
	TransactionController.getTransactionById
);

export default router;
