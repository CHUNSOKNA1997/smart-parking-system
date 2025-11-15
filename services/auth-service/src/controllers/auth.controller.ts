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

			const existingUser = await UserModel.findByEmail(email);
			if (existingUser) {
				return sendError(res, 400, ERRORS.EMAIL_ALREADY_EXISTS);
			}

			const passwordHash = await bcrypt.hash(password, 10);

			const verificationOtp = generateOTP();
			const otpExpiry = getOTPExpiry();

			const user = await UserModel.create({
				firstName,
				lastName,
				email,
				passwordHash,
				verificationOtp,
				otpExpiry,
			});

			try {
				await sendVerificationOTP(email, verificationOtp);
			} catch (emailError) {
				console.error(
					"[AUTH] Failed to send verification OTP:",
					emailError
				);
			}

			console.log(`[AUTH] New user registered: ${email}`);

			return sendSuccess(res, 201, SUCCESS.REGISTRATION, {
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
				},
			});
		} catch (error) {
			console.error("[AUTH] Registration error:", error);
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

			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendError(res, 401, ERRORS.INVALID_CREDENTIALS);
			}

			if (!user.isVerified) {
				return sendError(res, 403, ERRORS.EMAIL_NOT_VERIFIED);
			}

			const isValidPassword = await bcrypt.compare(
				password,
				user.passwordHash
			);
			if (!isValidPassword) {
				return sendError(res, 401, ERRORS.INVALID_CREDENTIALS);
			}

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
			console.error("[AUTH] Login error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/email/verify:
	 *   post:
	 *     summary: Verify email with OTP
	 *     tags: [Auth - Email Verification]
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

			const user = await UserModel.findByOTP(email, otp);
			if (!user) {
				return sendError(res, 400, "Invalid or expired OTP");
			}

			if (user.isVerified) {
				return sendSuccess(res, 200, "Email already verified");
			}

			await UserModel.verifyEmail(user.id);

			try {
				await sendWelcomeEmail(user.email, user.firstName);
			} catch (emailError) {
				console.error("[AUTH] Failed to send welcome email:", emailError);
			}

			console.log(`[AUTH] Email verified: ${user.email}`);

			return sendSuccess(res, 200, SUCCESS.EMAIL_VERIFIED);
		} catch (error) {
			console.error("[AUTH] OTP verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/email/verify/resend:
	 *   post:
	 *     summary: Resend email verification OTP
	 *     tags: [Auth - Email Verification]
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

			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendError(res, 404, ERRORS.USER_NOT_FOUND);
			}

			if (user.isVerified) {
				return sendError(res, 400, "Email already verified");
			}

			const verificationOtp = generateOTP();
			const otpExpiry = getOTPExpiry();
			await UserModel.updateVerificationOTP(user.id, verificationOtp, otpExpiry);

			await sendVerificationOTP(email, verificationOtp);

			console.log(`[AUTH] Verification OTP resent to: ${email}`);

			return sendSuccess(res, 200, SUCCESS.VERIFICATION_SENT);
		} catch (error) {
			console.error("[AUTH] Resend verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/password/reset/request:
	 *   post:
	 *     summary: Request password reset OTP
	 *     tags: [Auth - Password Reset]
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

			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET_SENT);
			}

			const resetOtp = generateOTP();
			const resetOtpExpiry = getResetOTPExpiry();

			await UserModel.setResetOTP(user.id, resetOtp, resetOtpExpiry);

			await sendPasswordResetOTP(email, resetOtp);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET_SENT);
		} catch (error) {
			console.error("[AUTH] Forgot password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/password/reset/verify:
	 *   post:
	 *     summary: Verify password reset OTP
	 *     tags: [Auth - Password Reset]
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
	 *         description: OTP verified successfully
	 *       400:
	 *         description: Invalid or expired OTP
	 */
	static async verifyResetOTP(req: Request, res: Response): Promise<Response> {
		try {
			const { email, otp } = req.body;

			const user = await UserModel.findByResetOTP(email, otp);
			if (!user) {
				return sendError(res, 400, "Invalid or expired OTP");
			}

			return sendSuccess(res, 200, "OTP verified successfully. You can now reset your password.", {
				email: user.email,
			});
		} catch (error) {
			console.error("[AUTH] Verify reset OTP error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/password/reset:
	 *   post:
	 *     summary: Reset password (after OTP verification)
	 *     tags: [Auth - Password Reset]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             properties:
	 *               email:
	 *                 type: string
	 *               newPassword:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Password reset successfully
	 *       400:
	 *         description: User not found or OTP not verified
	 */
	static async resetPassword(req: Request, res: Response): Promise<Response> {
		try {
			const { email, newPassword } = req.body;

			const user = await UserModel.findByEmail(email);
			if (!user) {
				return sendError(res, 404, ERRORS.USER_NOT_FOUND);
			}

			if (!user.resetOtp || !user.resetOtpExpiry) {
				return sendError(res, 400, "Please verify OTP first");
			}

			if (user.resetOtpExpiry <= new Date()) {
				return sendError(res, 400, "OTP has expired. Please request a new one.");
			}

			const passwordHash = await bcrypt.hash(newPassword, 10);

			await UserModel.updatePassword(user.id, passwordHash);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET);
		} catch (error) {
			console.error("[AUTH] Reset password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/me:
	 *   get:
	 *     summary: Get current logged-in user
	 *     tags: [Auth - User]
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
			console.error("[AUTH] Get user error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	/**
	 * @swagger
	 * /api/v1/auth/token/verify:
	 *   post:
	 *     summary: Verify JWT token for microservices
	 *     tags: [Auth - Microservices]
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
	 *     tags: [Auth - Microservices]
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
			console.error("[AUTH] Get user by ID error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}
}

export default AuthController;
