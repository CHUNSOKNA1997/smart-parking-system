import TransactionModel from "../models/Transaction.model.js";
import { sendSuccess, sendError } from "../utils/response.js";

class TransactionController {
  // Get user transactions
  static async getUserTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 20;

      const transactions = await TransactionModel.findByUserId(userId, limit);

      return sendSuccess(res, 200, "Transactions retrieved successfully", {
        transactions,
        count: transactions.length,
      });
    } catch (error) {
      logger.error("Get user transactions error:", error);
      return sendError(
        res,
        500,
        "Failed to retrieve transactions",
        error.message
      );
    }
  }

  // Get transaction by ID
  static async getTransactionById(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user.userId;

      const transaction = await TransactionModel.findById(transactionId);

      if (!transaction) {
        return sendError(res, 404, "Transaction not found");
      }

      // Check if transaction belongs to user
      if (transaction.userId !== userId) {
        return sendError(res, 403, "Access denied");
      }

      return sendSuccess(res, 200, "Transaction retrieved successfully", {
        transaction,
      });
    } catch (error) {
      logger.error("Get transaction by ID error:", error);
      return sendError(
        res,
        500,
        "Failed to retrieve transaction",
        error.message
      );
    }
  }

  // Get user transaction summary
  static async getUserSummary(req, res) {
    try {
      const userId = req.user.userId;

      const summary = await TransactionModel.getUserSummary(userId);

      return sendSuccess(
        res,
        200,
        "Transaction summary retrieved successfully",
        { summary }
      );
    } catch (error) {
      logger.error("Get user summary error:", error);
      return sendError(
        res,
        500,
        "Failed to retrieve transaction summary",
        error.message
      );
    }
  }
}

export default TransactionController;
