import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import constants from '../utils/constants.js';
import { AuthRequest } from '../types/index.js';

const { ERRORS } = constants;

// Verify JWT token middleware
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return sendError(res, 401, ERRORS.UNAUTHORIZED);
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded: any) => {
      if (err) {
        return sendError(res, 403, ERRORS.INVALID_TOKEN);
      }

      // Attach user info to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    return sendError(res, 500, ERRORS.SERVER_ERROR);
  }
};
