import express from 'express';
import UserController from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = express.Router();

// All user routes require authentication
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, validate(updateProfileSchema), UserController.updateProfile);

export default router;
