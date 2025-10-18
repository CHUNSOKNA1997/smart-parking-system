import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import UserModel from "../models/User.model.js";
import {
	generateAccessToken,
	generateVerificationToken,
	generateResetToken,
} from "../services/token.service.js";
import {
	sendVerificationEmail,
	sendPasswordResetEmail,
	sendWelcomeEmail,
} from "../services/email.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import constants from "../utils/constants.js";
import logger from "../utils/logger.js";
import { AuthRequest } from "../types/index.js";

const { ERRORS, SUCCESS } = constants;

class AuthController {
	// Register new user
	static async register(req: Request, res: Response): Promise<Response> {
		try {
			const { firstName, lastName, email, password, phone } = req.body;

			// Check if email already exists
			const existingUser = await UserModel.findByEmail(email);
			if (existingUser) {
				return sendError(res, 400, ERRORS.EMAIL_ALREADY_EXISTS);
			}

			// Hash password
			const passwordHash = await bcrypt.hash(password, 10);

			// Generate verification token
			const verificationToken = generateVerificationToken();

			// Create user
			const user = await UserModel.create({
				firstName,
				lastName,
				email,
				passwordHash,
				verificationToken,
				phone,
			});

			// Send verification email
			try {
				await sendVerificationEmail(email, verificationToken);
			} catch (emailError) {
				logger.error("Failed to send verification email:", emailError);
				// Continue even if email fails
			}

			logger.info(`New user registered: ${email}`);

			return sendSuccess(res, 201, SUCCESS.REGISTRATION, {
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
				},
			});
		} catch (error) {
			logger.error("Registration error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Login user
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

			// Generate JWT token
			const token = generateAccessToken(user.id, user.email);

			logger.info(`User logged in: ${email}`);

			return sendSuccess(res, 200, SUCCESS.LOGIN, {
				token,
				user: {
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					phone: user.phone,
				},
			});
		} catch (error) {
			logger.error("Login error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Verify email
	static async verifyEmail(req: Request, res: Response): Promise<Response> {
		try {
			const { token } = req.params;

			// Find user by verification token
			const user = await UserModel.findByVerificationToken(token);
			if (!user) {
				return sendError(res, 400, ERRORS.INVALID_TOKEN);
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
				logger.error("Failed to send welcome email:", emailError);
			}

			logger.info(`Email verified: ${user.email}`);

			return sendSuccess(res, 200, SUCCESS.EMAIL_VERIFIED);
		} catch (error) {
			logger.error("Email verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Resend verification email
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

			// Generate new verification token
			const verificationToken = generateVerificationToken();
			await UserModel.updateVerificationToken(user.id, verificationToken);

			// Send verification email
			await sendVerificationEmail(email, verificationToken);

			logger.info(`Verification email resent to: ${email}`);

			return sendSuccess(res, 200, SUCCESS.VERIFICATION_SENT);
		} catch (error) {
			logger.error("Resend verification error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Forgot password
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

			// Generate reset token
			const resetToken = generateResetToken();
			const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

			// Save reset token
			await UserModel.setResetToken(user.id, resetToken, expiry);

			// Send reset email
			await sendPasswordResetEmail(email, resetToken);

			logger.info(`Password reset email sent to: ${email}`);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET_SENT);
		} catch (error) {
			logger.error("Forgot password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Reset password
	static async resetPassword(req: Request, res: Response): Promise<Response> {
		try {
			const { token, newPassword } = req.body;

			// Find user by reset token
			const user = await UserModel.findByResetToken(token);
			if (!user) {
				return sendError(res, 400, ERRORS.INVALID_TOKEN);
			}

			// Hash new password
			const passwordHash = await bcrypt.hash(newPassword, 10);

			// Update password
			await UserModel.updatePassword(user.id, passwordHash);

			logger.info(`Password reset successful for: ${user.email}`);

			return sendSuccess(res, 200, SUCCESS.PASSWORD_RESET);
		} catch (error) {
			logger.error("Reset password error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Get current user (for protected routes)
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
			logger.error("Get user error:", error);
			return sendError(res, 500, ERRORS.SERVER_ERROR, error.message);
		}
	}

	// Verify token endpoint (for other microservices)
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
}

export default AuthController;
