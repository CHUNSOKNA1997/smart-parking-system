import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import UserModel from "../models/User.model.js";
import {
	generateAccessToken,
} from "../services/token.service.js";
import {
	sendVerificationOTP,
	sendPasswordResetOTP,
	sendWelcomeEmail,
} from "../services/email.service.js";
import { generateOTP, getOTPExpiry, getResetOTPExpiry } from "../utils/otp.js";
import { sendSuccess, sendError } from "../utils/response.js";
import constants from "../utils/constants.js";
import { AuthRequest } from "../types/index.js";

const { ERRORS, SUCCESS } = constants;

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 */

class AuthController {
	/**
	 * @swagger
	 * /api/v1/auth/register:
	 *   post:
	 *     summary: Register a new user
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               firstName:
	 *                 type: string
	 *               lastName:
	 *                 type: string
	 *               email:
	 *                 type: string
	 *               password:
	 *                 type: string
	 *     responses:
	 *       201:
	 *         description: User registered successfully
	 *       400:
	 *         description: Email already exists
	 */
	static async register(req: Request, res: Response): Promise<Response> {
		try {
			const { firstName, lastName, email, password } = req.body;

			// Check if email already exists
			const existingUser = await UserModel.findByEmail(email);
			if (existingUser) {
				return sendError(res, 400, ERRORS.EMAIL_ALREADY_EXISTS);
			}

			// Hash password
			const passwordHash = await bcrypt.hash(password, 10);

			// Generate OTP
			const verificationOtp = generateOTP();
			const otpExpiry = getOTPExpiry();

			// Create user
			const user = await UserModel.create({
				firstName,
				lastName,
				email,
				passwordHash,
				verificationOtp,
				otpExpiry,
			});

			// Send verification OTP email
			try {
				await sendVerificationOTP(email, verificationOtp);
			} catch (emailError) {
				console.error(
					"❌ Failed to send verification OTP:",
					emailError
				);
				// Continue even if email fails
			}

			console.log(`✅ New user registered: ${email}`);

			return sendSuccess(res, 201, SUCCESS.REGISTRATION, {
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
				},
			});
		} catch (error) {
			console.error("❌ Registration error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/login:
	 *   post:
	 *     summary: Login a user
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *               password:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Login successful
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 token:
	 *                   type: string
	 *                 user:
	 *                   type: object
	 *       401:
	 *         description: Invalid credentials
	 *       403:
	 *         description: Email not verified
	 */
	static async login(req: Request, res: Response): Promise<Response> {
		try {
			const { email, password } = req.body;

			// Find user
			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendError(res, 401, ERRORS.INVALID_CREDENTIALS);
			}

			// Check if email is verified
			if (!user.isVerified) {
				return sendError(res, 403, ERRORS.EMAIL_NOT_VERIFIED);
			}

			// Verify password
			const isValidPassword = await bcrypt.compare(
				password,
				user.passwordHash
			);
			if (!isValidPassword) {
				return sendError(res, 401, ERRORS.INVALID_CREDENTIALS);
			}

			// Generate JWT token with user info
			const token = generateAccessToken(
				user.id,
				user.email,
				user.firstName,
				user.lastName
			);

			return sendSuccess(res, 200, SUCCESS.LOGIN, {
				token,
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
				},
			});
		} catch (error) {
			console.error("❌ Login error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/verify-otp:
	 *   post:
	 *     summary: Verify email with OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *               otp:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Email verified
	 *       400:
	 *         description: Invalid or expired OTP
	 */
	static async verifyOTP(req: Request, res: Response): Promise<Response> {
		try {
			const { email, otp } = req.body;

			// Find user by email and OTP
			const user = await UserModel.findByOTP(email, otp);
			if (!user) {
				return sendError(res, 400, "Invalid or expired OTP");
			}

			// Check if already verified
			if (user.isVerified) {
				return sendSuccess(res, 200, "Email already verified");
			}

			// Verify email
			await UserModel.verifyEmail(user.id);

			// Send welcome email
			try {
				await sendWelcomeEmail(user.email, user.firstName);
			} catch (emailError) {
				console.error("❌ Failed to send welcome email:", emailError);
			}

			console.log(`✅ Email verified: ${user.email}`);

			return sendSuccess(res, 200, SUCCESS.EMAIL_VERIFIED);
		} catch (error) {
			console.error("❌ OTP verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/resend-verification:
	 *   post:
	 *     summary: Resend verification email
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Verification email sent
	 *       400:
	 *         description: Email already verified
	 *       404:
	 *         description: User not found
	 */
	static async resendVerification(
		req: Request,
		res: Response
	): Promise<Response> {
		try {
			const { email } = req.body;

			// Find user
			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendError(res, 404, ERRORS.USER_NOT_FOUND);
			}

			// Check if already verified
			if (user.isVerified) {
				return sendError(res, 400, "Email already verified");
			}

			// Generate new OTP
			const verificationOtp = generateOTP();
			const otpExpiry = getOTPExpiry();
			await UserModel.updateVerificationOTP(user.id, verificationOtp, otpExpiry);

			// Send verification OTP email
			await sendVerificationOTP(email, verificationOtp);

			console.log(`✅ Verification OTP resent to: ${email}`);

			return sendSuccess(res, 200, SUCCESS.VERIFICATION_SENT);
		} catch (error) {
			console.error("❌ Resend verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/forgot-password:
	 *   post:
	 *     summary: Request password reset
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Password reset email sent
	 */
	static async forgotPassword(
		req: Request,
		res: Response
	): Promise<Response> {
		try {
			const { email } = req.body;

			// Find user
			const user = await UserModel.findByEmail(email);
			if (!user) {
				// Don't reveal if email exists for security
				return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET_SENT);
			}

			// Generate reset OTP
			const resetOtp = generateOTP();
			const resetOtpExpiry = getResetOTPExpiry();

			// Save reset OTP
			await UserModel.setResetOTP(user.id, resetOtp, resetOtpExpiry);

			// Send reset OTP email
			await sendPasswordResetOTP(email, resetOtp);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET_SENT);
		} catch (error) {
			console.error("❌ Forgot password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/reset-password:
	 *   post:
	 *     summary: Reset password with OTP
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *               otp:
	 *                 type: string
	 *               newPassword:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Password reset successfully
	 *       400:
	 *         description: Invalid or expired OTP
	 */
	static async resetPassword(req: Request, res: Response): Promise<Response> {
		try {
			const { email, otp, newPassword } = req.body;

			// Find user by reset OTP
			const user = await UserModel.findByResetOTP(email, otp);
			if (!user) {
				return sendError(res, 400, "Invalid or expired OTP");
			}

			// Hash new password
			const passwordHash = await bcrypt.hash(newPassword, 10);

			// Update password
			await UserModel.updatePassword(user.id, passwordHash);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET);
		} catch (error) {
			console.error("❌ Reset password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/user:
	 *   get:
	 *     summary: Get current logged-in user
	 *     tags: [Auth]
	 *     security:
	 *       - bearerAuth: []
	 *     responses:
	 *       200:
	 *         description: Current user info
	 *       401:
	 *         description: Unauthorized
	 */
	static async getMe(req: AuthRequest, res: Response): Promise<Response> {
		try {
			const userId = req.user!.userId;

			const user = await UserModel.findById(userId);
			if (!user) {
				return sendError(res, 404, ERRORS.USER_NOT_FOUND);
			}

			return sendSuccess(res, 200, "User retrieved successfully", {
				user,
			});
		} catch (error) {
			console.error("❌ Get user error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/verify-token:
	 *   post:
	 *     summary: Verify JWT token for microservices
	 *     tags: [Auth]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               token:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Token is valid
	 *       400:
	 *         description: Token missing
	 *       401:
	 *         description: Invalid token
	 */
	static async verifyToken(req: Request, res: Response): Promise<Response> {
		try {
			const { token } = req.body;

			if (!token) {
				return sendError(res, 400, "Token is required");
			}

			jwt.verify(
				token,
				process.env.JWT_SECRET as string,
				(err: any, decoded: any) => {
					if (err) {
						return sendError(res, 401, ERRORS.INVALID_TOKEN);
					}
					return sendSuccess(res, 200, "Token is valid", {
						user: decoded,
					});
				}
			);
		} catch (error) {
			return sendError(res, 401, ERRORS.INVALID_TOKEN);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/users/{userId}:
	 *   get:
	 *     summary: Get user by ID (for microservices)
	 *     tags: [Auth]
	 *     parameters:
	 *       - in: path
	 *         name: userId
	 *         schema:
	 *           type: string
	 *         required: true
	 *         description: User ID
	 *     responses:
	 *       200:
	 *         description: User data
	 *       404:
	 *         description: User not found
	 */
	static async getUserById(req: Request, res: Response): Promise<Response> {
		try {
			const { userId } = req.params;

			const user = await UserModel.findById(userId);
			if (!user) {
				return sendError(res, 404, ERRORS.USER_NOT_FOUND);
			}

			return sendSuccess(res, 200, "User retrieved successfully", {
				user,
			});
		} catch (error) {
			console.error("❌ Get user by ID error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}
}

export default AuthController;
