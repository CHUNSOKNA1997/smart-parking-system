import express from "express";
import TransactionController from "../controllers/transaction.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// All transaction routes require authentication
router.get(
	"/user",
	authenticateToken,
	TransactionController.getUserTransactions
);
router.get("/summary", authenticateToken, TransactionController.getUserSummary);
router.get(
	"/:transactionId",
	authenticateToken,
	TransactionController.getTransactionById
);

export default router;
