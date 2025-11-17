import express from "express";
import TransactionController from "../controllers/transaction.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// All transaction routes require authentication
// Get current user's transactions
router.get("/me", authenticateToken, TransactionController.getUserTransactions);

// Get current user's transaction summary
router.get(
    "/me/summary",
    authenticateToken,
    TransactionController.getUserSummary
);

// Get specific transaction by ID
router.get(
    "/:transactionId",
    authenticateToken,
    TransactionController.getTransactionById
);

export default router;
