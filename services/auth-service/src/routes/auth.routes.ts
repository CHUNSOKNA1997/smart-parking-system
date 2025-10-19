import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  emailSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  otpVerificationSchema
} from '../validators/auth.validator.js';

const router = express.Router();

// Authentication routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);

// Email verification routes
router.post('/email/verify', validate(otpVerificationSchema), AuthController.verifyOTP);
router.post('/email/verify/resend', validate(emailSchema), AuthController.resendVerification);

// Password reset routes
router.post('/password/reset/request', validate(emailSchema), AuthController.forgotPassword);
router.post('/password/reset/verify', validate(verifyResetOtpSchema), AuthController.verifyResetOTP);
router.post('/password/reset', validate(resetPasswordSchema), AuthController.resetPassword);

// Current user route (protected)
router.get('/me', authenticateToken, AuthController.getMe);

// Token verification (for microservices)
router.post('/token/verify', AuthController.verifyToken);

// User by ID (for microservices)
router.get('/users/:userId', AuthController.getUserById);

export default router;
