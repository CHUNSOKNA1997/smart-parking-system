import type { Request, Response } from "express";
import { paymentService } from "../services/payment.service.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { HTTP_STATUS } from "../utils/constants.js";

export class PaymentController {
	/**
	 * Create new payment
	 */
	async createPayment(req: Request, res: Response): Promise<void> {
		try {
			const { bookingId, amount, currency, description } = req.body;
			const userId = req.user?.userId;

			if (!userId) {
				res.status(HTTP_STATUS.UNAUTHORIZED).json(
					errorResponse("User not authenticated")
				);
				return;
			}

			const payment = await paymentService.createPayment({
				bookingId,
				userId,
				amount,
				currency,
				description,
			});

			res.status(HTTP_STATUS.CREATED).json(
				successResponse("Payment created successfully", payment)
			);
		} catch (error: any) {
			console.error("Create payment error:", error);
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
				errorResponse("Failed to create payment", error.message)
			);
		}
	}

	/**
	 * Get payment by ID
	 */
	async getPaymentById(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			const payment = await paymentService.getPaymentById(id);

			res.status(HTTP_STATUS.OK).json(
				successResponse("Payment retrieved successfully", payment)
			);
		} catch (error: any) {
			console.error("Get payment error:", error);
			res.status(HTTP_STATUS.NOT_FOUND).json(
				errorResponse("Payment not found", error.message)
			);
		}
	}

	/**
	 * Verify payment
	 */
	async verifyPayment(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { transactionHash } = req.body;

			const result = await paymentService.verifyPayment({
				paymentId: id,
				transactionHash,
			});

			res.status(HTTP_STATUS.OK).json(
				successResponse("Payment verified successfully", result)
			);
		} catch (error: any) {
			console.error("Verify payment error:", error);
			res.status(HTTP_STATUS.BAD_REQUEST).json(
				errorResponse("Payment verification failed", error.message)
			);
		}
	}

	/**
	 * Get user payments
	 */
	async getUserPayments(req: Request, res: Response): Promise<void> {
		try {
			const { userId } = req.params;

			const payments = await paymentService.getPaymentsByUserId(userId);

			res.status(HTTP_STATUS.OK).json(
				successResponse("Payments retrieved successfully", payments)
			);
		} catch (error: any) {
			console.error("Get user payments error:", error);
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
				errorResponse("Failed to retrieve payments", error.message)
			);
		}
	}

	/**
	 * Get booking payments
	 */
	async getBookingPayments(req: Request, res: Response): Promise<void> {
		try {
			const { bookingId } = req.params;

			const payments = await paymentService.getPaymentsByBookingId(
				bookingId
			);

			res.status(HTTP_STATUS.OK).json(
				successResponse("Payments retrieved successfully", payments)
			);
		} catch (error: any) {
			console.error("Get booking payments error:", error);
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
				errorResponse("Failed to retrieve payments", error.message)
			);
		}
	}

	/**
	 * Get QR code image for payment
	 */
	async getQRImage(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			const qrImage = await paymentService.generateQRImage(id);

			res.status(HTTP_STATUS.OK).json(
				successResponse("QR image generated successfully", { qrImage })
			);
		} catch (error: any) {
			console.error("Get QR image error:", error);
			res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
				errorResponse("Failed to generate QR image", error.message)
			);
		}
	}
}

export const paymentController = new PaymentController();
