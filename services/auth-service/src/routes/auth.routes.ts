import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  emailSchema,
  resetPasswordSchema,
  otpVerificationSchema
} from '../validators/auth.validator.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/verify-otp', validate(otpVerificationSchema), AuthController.verifyOTP);
router.post('/resend-verification', validate(emailSchema), AuthController.resendVerification);
router.post('/forgot-password', validate(emailSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected routes
router.get('/user', authenticateToken, AuthController.getMe);

// For other microservices
router.post('/verify-token', AuthController.verifyToken);
router.get('/users/:userId', AuthController.getUserById);

export default router;
