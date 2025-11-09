/**
 * KHQR Payment Service
 * Handles payment creation, verification, and management
 */

import prisma from "../config/prisma.js";
import { khqrBakongService } from "./bakong.service.js";
import { khqrGenerator } from "./khqr-generator.service.js";
import type {
	CreatePaymentRequest,
	CreatePaymentResponse,
	VerifyPaymentRequest,
	VerifyPaymentResponse,
	KHQRCurrency,
} from "../types/index.js";
import {
	KHQR_PAYMENT_STATUS,
	KHQR_ERROR_MESSAGES,
} from "../utils/constants.js";

class PaymentService {
	/**
	 * Create a new KHQR payment
	 */
	async createPayment(
		request: CreatePaymentRequest
	): Promise<CreatePaymentResponse> {
		// Validate KHQR configuration
		const configValidation = khqrGenerator.validateConfig();
		if (!configValidation.valid) {
			throw new Error(
				'KHQR configuration incomplete: ' + configValidation.errors.join(', ')
			);
		}

		// Generate valid KHQR string using merchant account details
		const qrString = khqrGenerator.generateQRString({
			amount: request.amount,
			currency: request.currency,
			billNumber: request.bookingId || undefined,
		});

		// Generate deeplink using Bakong API
		const deeplinkResult = await khqrBakongService.generateDeeplink({
			qr: qrString,
			sourceInfo: {
				appIconUrl: process.env.APP_ICON_URL || "",
				appName: process.env.APP_NAME || "Smart Parking",
				appDeepLinkCallback: process.env.APP_CALLBACK_URL || "",
			},
		});

		if (deeplinkResult.responseCode !== 0 || !deeplinkResult.data) {
			throw new Error(KHQR_ERROR_MESSAGES.DEEPLINK_GENERATION_FAILED);
		}

		// Save payment to database
		const payment = await prisma.kHQRPayment.create({
			data: {
				bookingId: request.bookingId,
				userId: request.userId,
				amount: request.amount,
				currency: request.currency,
				qrString: qrString,
				deeplinkUrl: deeplinkResult.data.shortLink,
				status: KHQR_PAYMENT_STATUS.PENDING,
				description: request.description,
			},
		});

		return {
			paymentId: payment.id,
			qrString: payment.qrString || "",
			deeplinkUrl: payment.deeplinkUrl || "",
			amount: Number(payment.amount),
			currency: payment.currency,
			status: payment.status,
			createdAt: payment.createdAt,
		};
	}

	/**
	 * Verify payment using transaction hash
	 */
	async verifyPayment(
		request: VerifyPaymentRequest
	): Promise<VerifyPaymentResponse> {
		// Get payment from database
		const payment = await prisma.kHQRPayment.findUnique({
			where: { id: request.paymentId },
		});

		if (!payment) {
			throw new Error(KHQR_ERROR_MESSAGES.PAYMENT_NOT_FOUND);
		}

		if (payment.status === KHQR_PAYMENT_STATUS.PAID) {
			throw new Error(KHQR_ERROR_MESSAGES.PAYMENT_ALREADY_VERIFIED);
		}

		// Check transaction with Bakong API
		const transactionResult =
			await khqrBakongService.checkTransactionByHash({
				hash: request.transactionHash,
			});

		if (transactionResult.responseCode !== 0 || !transactionResult.data) {
			// Update payment status to failed
			await prisma.kHQRPayment.update({
				where: { id: request.paymentId },
				data: { status: KHQR_PAYMENT_STATUS.FAILED },
			});

			throw new Error(KHQR_ERROR_MESSAGES.TRANSACTION_NOT_FOUND);
		}

		const transactionData = transactionResult.data;

		// Verify amount and currency match
		if (Number(transactionData.amount) !== Number(payment.amount)) {
			throw new Error(KHQR_ERROR_MESSAGES.AMOUNT_MISMATCH);
		}

		if (transactionData.currency !== payment.currency) {
			throw new Error(KHQR_ERROR_MESSAGES.CURRENCY_MISMATCH);
		}

		// Update payment as verified
		const updatedPayment = await prisma.kHQRPayment.update({
			where: { id: request.paymentId },
			data: {
				status: KHQR_PAYMENT_STATUS.PAID,
				transactionHash: request.transactionHash,
				fromAccountId: transactionData.fromAccountId,
				toAccountId: transactionData.toAccountId,
				paidAt: new Date(),
			},
		});

		return {
			paymentId: updatedPayment.id,
			status: updatedPayment.status as any,
			transactionData,
			verifiedAt: updatedPayment.paidAt || new Date(),
		};
	}

	/**
	 * Get payment by ID
	 */
	async getPaymentById(paymentId: string) {
		const payment = await prisma.kHQRPayment.findUnique({
			where: { id: paymentId },
		});

		if (!payment) {
			throw new Error(KHQR_ERROR_MESSAGES.PAYMENT_NOT_FOUND);
		}

		return payment;
	}

	/**
	 * Get payments by user ID
	 */
	async getPaymentsByUserId(userId: string) {
		return await prisma.kHQRPayment.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Get payments by booking ID
	 */
	async getPaymentsByBookingId(bookingId: string) {
		return await prisma.kHQRPayment.findMany({
			where: { bookingId },
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Generate QR code image for payment
	 */
	async generateQRImage(paymentId: string): Promise<string> {
		const payment = await this.getPaymentById(paymentId);
		
		if (!payment.qrString) {
			throw new Error('Payment does not have a QR string');
		}

		return await khqrGenerator.generateQRImage(payment.qrString);
	}
}

export const paymentService = new PaymentService();
export default PaymentService;
