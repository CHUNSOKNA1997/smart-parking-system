import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { AuthRequest } from '../types/index.js';

/**
 * Middleware to authenticate and verify JWT tokens.
 * Extracts the token from the Authorization header, verifies it,
 * and attaches the decoded user information to the request object.
 *
 * @param req - Express request object (extended with user property)
 * @param res - Express response object
 * @param next - Express next middleware function
 * @returns Error response if authentication fails, otherwise proceeds to next middleware
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
  try {
    // Extract token from Authorization header (format: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 401, "Unauthorized access");
    }

    // Verify token signature and decode payload
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded: any) => {
      if (err) {
        return sendError(res, 403, "Invalid or expired token");
      }

      // Attach decoded user information to request for downstream middleware/handlers
      req.user = decoded;
      next();
    });
  } catch (error) {
    return sendError(res, 500, "Internal server error");
  }
};
