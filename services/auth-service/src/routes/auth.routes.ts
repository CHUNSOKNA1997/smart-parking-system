import express from "express";
import AuthController from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
    registerSchema,
    loginSchema,
    emailSchema,
    verifyResetOtpSchema,
    resetPasswordSchema,
    otpVerificationSchema,
    updateUserSchema,
} from "../validators/auth.validator.js";
import { uploadProfile, handleUploadError } from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email already exists or invalid input
 */
router.post("/register", validate(registerSchema), AuthController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials or email not verified
 */
router.post("/login", validate(loginSchema), AuthController.login);

/**
 * @swagger
 * /api/v1/auth/email/verify:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
    "/email/verify",
    validate(otpVerificationSchema),
    AuthController.verifyOTP
);

/**
 * @swagger
 * /api/v1/auth/email/verify/resend:
 *   post:
 *     summary: Resend email verification OTP
 *     tags: [Email Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email sent
 *       404:
 *         description: User not found
 */
router.post(
    "/email/verify/resend",
    validate(emailSchema),
    AuthController.resendVerification
);

/**
 * @swagger
 * /api/v1/auth/password/reset/request:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset OTP sent to email
 *       404:
 *         description: User not found
 */
router.post(
    "/password/reset/request",
    validate(emailSchema),
    AuthController.forgotPassword
);

/**
 * @swagger
 * /api/v1/auth/password/reset/verify:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified, ready to reset password
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
    "/password/reset/verify",
    validate(verifyResetOtpSchema),
    AuthController.verifyResetOTP
);

/**
 * @swagger
 * /api/v1/auth/password/reset:
 *   post:
 *     summary: Reset password with verified OTP
 *     tags: [Password Reset]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
    "/password/reset",
    validate(resetPasswordSchema),
    AuthController.resetPassword
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticateToken, AuthController.getMe);

/**
 * @swagger
 * /api/v1/auth/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [User]
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
router.put(
    "/me",
    authenticateToken,
    validate(updateUserSchema),
    AuthController.updateMe
);

router.post(
    "/me/profile-image",
    authenticateToken,
    (req, res, next) => {
        // Debug logging
        console.log('[UPLOAD] Headers:', req.headers);
        console.log('[UPLOAD] Content-Type:', req.headers['content-type']);
        console.log('[UPLOAD] Content-Length:', req.headers['content-length']);
        next();
    },
    uploadProfile.single("image"),
    handleUploadError,
    AuthController.uploadProfileImage
);

// Base64 upload endpoint (simpler for mobile apps)
router.put(
    "/me/profile-image-base64",
    authenticateToken,
    AuthController.uploadProfileImageBase64
);


/**
 * @swagger
 * /api/v1/auth/token/verify:
 *   post:
 *     summary: Verify JWT token (for microservices)
 *     tags: [Token]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.post("/token/verify", AuthController.verifyToken);


export default router;
