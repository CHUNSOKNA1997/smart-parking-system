import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/response.js";
import jwt from "jsonwebtoken";

/**
 * JWT payload structure for authenticated requests.
 */
interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Middleware to authenticate and verify JWT tokens for Payment service endpoints.
 * Validates the Authorization header, verifies the token, and attaches user information to the request.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json(
                errorResponse("No token provided", "UNAUTHORIZED")
            );
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || ""
            ) as JWTPayload;

            req.user = decoded;
            next();
        } catch (jwtError) {
            res.status(401).json(
                errorResponse("Invalid or expired token", "UNAUTHORIZED")
            );
            return;
        }
    } catch (error: any) {
        res.status(500).json(
            errorResponse("Authentication failed", error.message)
        );
    }
};
