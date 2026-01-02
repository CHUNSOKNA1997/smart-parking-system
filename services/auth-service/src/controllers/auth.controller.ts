import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import fs from "fs";
import UserModel from "../models/User.model.js";
import { generateAccessToken } from "../services/token.service.js";
import {
    sendVerificationOTP,
    sendPasswordResetOTP,
    sendWelcomeEmail,
} from "../services/email.service.js";
import { generateOTP, getOTPExpiry, getResetOTPExpiry } from "../utils/otp.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { AuthRequest } from "../types/index.js";

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
                return sendError(res, 400, "Email already registered");
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

            // Generate token for unverified user (allows them to verify email and check status)
            const token = generateAccessToken(user.id);

            return sendSuccess(
                res,
                201,
                "Registration successful. Please check your email for the verification code.",
                {
                    token,
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        isVerified: false,
                    },
                }
            );
        } catch (error) {
            console.error("[AUTH] Registration error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
                return sendError(res, 401, "Invalid email or password");
            }

            if (!user.isVerified) {
                return sendError(
                    res,
                    403,
                    "Please verify your email before logging in"
                );
            }

            const isValidPassword = await bcrypt.compare(
                password,
                user.passwordHash
            );
            if (!isValidPassword) {
                return sendError(res, 401, "Invalid email or password");
            }

            const token = generateAccessToken(
                user.id,
                user.email,
                user.firstName,
                user.lastName
            );

            return sendSuccess(res, 200, "Login successful", {
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
            return sendError(res, 500, "Internal server error", error.message);
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
                console.error(
                    "[AUTH] Failed to send welcome email:",
                    emailError
                );
            }

            console.log(`[AUTH] Email verified: ${user.email}`);

            // Generate token for auto-login after verification
            const token = generateAccessToken(user.id);

            return sendSuccess(
                res,
                200,
                "Email verified successfully",
                {
                    token,
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        isVerified: true,
                        createdAt: user.createdAt,
                    },
                }
            );
        } catch (error) {
            console.error("[AUTH] OTP verification error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
                return sendError(res, 404, "User not found");
            }

            if (user.isVerified) {
                return sendError(res, 400, "Email already verified");
            }

            const verificationOtp = generateOTP();
            const otpExpiry = getOTPExpiry();
            await UserModel.updateVerificationOTP(
                user.id,
                verificationOtp,
                otpExpiry
            );

            await sendVerificationOTP(email, verificationOtp);

            console.log(`[AUTH] Verification OTP resent to: ${email}`);

            return sendSuccess(res, 200, "Verification code sent successfully");
        } catch (error) {
            console.error("[AUTH] Resend verification error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
                return sendError(res, 404, "User not found");
            }

            const resetOtp = generateOTP();
            const resetOtpExpiry = getResetOTPExpiry();

            await UserModel.setResetOTP(user.id, resetOtp, resetOtpExpiry);

            await sendPasswordResetOTP(email, resetOtp);

            return sendSuccess(
                res,
                200,
                "Password reset code sent to your email"
            );
        } catch (error) {
            console.error("[AUTH] Forgot password error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
    static async verifyResetOTP(
        req: Request,
        res: Response
    ): Promise<Response> {
        try {
            const { email, otp } = req.body;

            const user = await UserModel.findByResetOTP(email, otp);
            if (!user) {
                return sendError(res, 400, "Invalid or expired OTP");
            }

            return sendSuccess(
                res,
                200,
                "OTP verified successfully. You can now reset your password.",
                {
                    email: user.email,
                }
            );
        } catch (error) {
            console.error("[AUTH] Verify reset OTP error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
            const { email, otp, newPassword } = req.body;

            if (!otp) {
                return sendError(res, 400, "OTP is required");
            }

            const user = await UserModel.findByEmail(email);
            if (!user) {
                return sendError(res, 404, "User not found");
            }

            if (!user.resetOtp || !user.resetOtpExpiry) {
                return sendError(res, 400, "Please request password reset first");
            }

            if (user.resetOtpExpiry <= new Date()) {
                return sendError(
                    res,
                    400,
                    "OTP has expired. Please request a new one."
                );
            }

            // Verify OTP matches
            if (user.resetOtp !== otp) {
                return sendError(res, 400, "Invalid OTP");
            }

            const passwordHash = await bcrypt.hash(newPassword, 10);

            await UserModel.updatePassword(user.id, passwordHash);

            // Clear reset OTP after successful password reset
            await UserModel.clearResetOtp(user.id);

            return sendSuccess(
                res,
                200,
                "Password reset successful. You can now login with your new password."
            );
        } catch (error) {
            console.error("[AUTH] Reset password error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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
                return sendError(res, 404, "User not found");
            }

            return sendSuccess(res, 200, "User retrieved successfully", {
                user,
            });
        } catch (error) {
            console.error("[AUTH] Get user error:", error);
            return sendError(res, 500, "Internal server error", error.message);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/me:
     *   put:
     *     summary: Update current user profile
     *     tags: [Auth - User]
     *     security:
     *       - bearerAuth: []
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
     *               phone:
     *                 type: string
     *     responses:
     *       200:
     *         description: Profile updated successfully
     *       400:
     *         description: Invalid input
     *       401:
     *         description: Unauthorized
     */
    static async updateMe(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user!.userId;
            const { firstName, lastName, phone } = req.body;

            const updatedUser = await UserModel.updateProfile(userId, {
                firstName,
                lastName,
                phone,
            });

            return sendSuccess(res, 200, "Profile updated successfully", {
                user: updatedUser,
            });
        } catch (error) {
            console.error("[AUTH] Update profile error:", error);
            return sendError(res, 500, "Internal server error", error.message);
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

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET as string
            );
            
            return sendSuccess(res, 200, "Token is valid", {
                user: decoded,
            });
        } catch (error: any) {
            console.error("[AUTH] Token verification failed:", error.message);
            return sendError(res, 401, "Invalid or expired token");
        }
    }


    /**
     * @swagger
     * /api/v1/auth/me/profile-image:
     *   post:
     *     summary: Upload profile image
     *     tags: [Auth - User]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               image:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: Profile image uploaded successfully
     *       400:
     *         description: No file uploaded
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    static async uploadProfileImage(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user!.userId;

            if (!req.file) {
                return sendError(res, 400, "No file uploaded");
            }

            // Construct full URL or relative path
            // For now, we'll store the relative path. 
            // In a real app, you'd construct a full URL based on the server address or upload to S3.
            const profileImagePath = req.file.path.replace(/\\/g, "/"); // normalize path

            const updatedUser = await UserModel.updateProfile(userId, {
                profileImage: profileImagePath,
            });

            return sendSuccess(res, 200, "Profile image uploaded successfully", {
                user: updatedUser,
            });
        } catch (error) {
            console.error("[AUTH] Upload profile image error:", error);
            // If database update fails, we might want to delete the uploaded file
            // fs.unlinkSync(req.file.path);
            return sendError(res, 500, "Internal server error", error.message);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/me/profile-image-base64:
     *   put:
     *     summary: Upload profile image as base64
     *     tags: [Auth - User]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - image
     *             properties:
     *               image:
     *                 type: string
     *                 description: Base64 encoded image data (with or without data URL prefix)
     *                 example: "data:image/png;base64,iVBORw0KGgo..."
     *     responses:
     *       200:
     *         description: Profile image uploaded successfully
     *       400:
     *         description: Invalid base64 data
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    static async uploadProfileImageBase64(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const userId = req.user!.userId;
            const { image } = req.body;

            if (!image || typeof image !== 'string') {
                return sendError(res, 400, "Image data is required");
            }

            // Remove data URL prefix if present (e.g., "data:image/png;base64,")
            const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

            // Validate base64
            if (!base64Data || base64Data.length === 0) {
                return sendError(res, 400, "Invalid image data");
            }

            // Create buffer from base64
            let imageBuffer: Buffer;
            try {
                imageBuffer = Buffer.from(base64Data, 'base64');
            } catch (error) {
                return sendError(res, 400, "Invalid base64 encoding");
            }

            // Check file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (imageBuffer.length > maxSize) {
                return sendError(res, 400, "Image too large. Maximum size is 5MB");
            }

            // Ensure uploads directory exists
            const uploadDir = "uploads/profiles";
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Generate unique filename
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

            // Detect image type from base64 header or default to jpg
            let extension = 'jpg';
            if (image.startsWith('data:image/png')) {
                extension = 'png';
            } else if (image.startsWith('data:image/jpeg') || image.startsWith('data:image/jpg')) {
                extension = 'jpg';
            } else if (image.startsWith('data:image/gif')) {
                extension = 'gif';
            } else if (image.startsWith('data:image/webp')) {
                extension = 'webp';
            }

            const filename = `profile-${uniqueSuffix}.${extension}`;
            const filepath = `${uploadDir}/${filename}`;

            // Write file to disk
            fs.writeFileSync(filepath, imageBuffer);

            // Normalize path for storage
            const normalizedPath = filepath.replace(/\\/g, "/");

            // Update user profile
            const updatedUser = await UserModel.updateProfile(userId, {
                profileImage: normalizedPath,
            });

            return sendSuccess(res, 200, "Profile image uploaded successfully", {
                user: updatedUser,
                imagePath: normalizedPath,
                imageUrl: `http://localhost:${process.env.PORT || 3001}/${normalizedPath}`
            });

        } catch (error) {
            console.error("[AUTH] Upload base64 image error:", error);
            return sendError(res, 500, "Internal server error", error.message);
        }
    }
}

export default AuthController;
