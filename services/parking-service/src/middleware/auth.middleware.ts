import { Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";
import { ERRORS } from "../utils/constants.js";
import { AuthRequest } from "../types/index.js";
import authServiceClient from "../services/authService.client.js";


// Verify JWT token middleware using Auth Service
export const authenticateToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		// Get token from Authorization header
		const authHeader = req.headers["authorization"];
		const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

		if (!token) {
			return sendError(res, 401, ERRORS.UNAUTHORIZED);
		}

		// Verify token with auth-service
		const result = await authServiceClient.verifyToken(token);

		if (!result.success || !result.data) {
			return sendError(res, 403, ERRORS.INVALID_TOKEN);
		}

		// Attach user info to request
		req.user = result.data.user;
		next();
	} catch (error: any) {
		console.error("Auth middleware error:", error.message);
		return sendError(res, 500, ERRORS.SERVER_ERROR);
	}
};
