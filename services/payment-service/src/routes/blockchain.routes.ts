/**
 * Blockchain Routes
 * API endpoints for blockchain verification and status
 */

import { Router, Request, Response } from "express";
import { blockchainService } from "../blockchain/blockchain.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import prisma from "../config/prisma.js";

const router = Router();

/**
 * @swagger
 * /api/v1/payments/blockchain/status:
 *   get:
 *     summary: Get blockchain service status
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Blockchain service status
 */
router.get("/status", async (req: Request, res: Response) => {
    try {
        const status = await blockchainService.getStatus();
        res.json({
            success: true,
            data: status,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get blockchain status",
            error: error.message,
        });
    }
});

/**
 * @swagger
 * /api/v1/payments/{paymentId}/blockchain:
 *   get:
 *     summary: Get blockchain verification for a payment
 *     tags: [Blockchain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blockchain verification details
 *       404:
 *         description: Payment not found
 */
router.get(
    "/:paymentId/blockchain",
    authMiddleware,
    async (req: Request, res: Response) => {
        try {
            const { paymentId } = req.params;

            // Get payment from database
            const payment = await prisma.transaction.findUnique({
                where: { id: paymentId },
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found",
                });
            }

            // Get on-chain data
            const onChainData = await blockchainService.getPayment(paymentId);
            const verified = await blockchainService.verifyPayment(paymentId);

            res.json({
                success: true,
                data: {
                    paymentId: payment.id,
                    amount: payment.amount.toString(),
                    currency: payment.currency,
                    status: payment.status,
                    blockchainTxHash: payment.blockchainTxHash,
                    blockchainBlock: payment.blockchainBlock,
                    blockchainStatus: payment.blockchainStatus,
                    onChainVerified: verified,
                    onChainData: onChainData,
                },
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: "Failed to verify payment on blockchain",
                error: error.message,
            });
        }
    }
);

/**
 * @swagger
 * /api/v1/payments/blockchain/verify/{txHash}:
 *   get:
 *     summary: Verify a transaction by its blockchain hash
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: txHash
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction verification result
 */
router.get("/verify/:txHash", async (req: Request, res: Response) => {
    try {
        const { txHash } = req.params;

        // Find payment by blockchain tx hash
        const payment = await prisma.transaction.findFirst({
            where: { blockchainTxHash: txHash },
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "No payment found with this transaction hash",
            });
        }

        // Verify on blockchain
        const verified = await blockchainService.verifyPayment(payment.id);
        const onChainData = await blockchainService.getPayment(payment.id);

        res.json({
            success: true,
            data: {
                paymentId: payment.id,
                transactionHash: txHash,
                verified: verified,
                onChainData: onChainData,
                recordedAt: payment.createdAt,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to verify transaction",
            error: error.message,
        });
    }
});

export default router;
