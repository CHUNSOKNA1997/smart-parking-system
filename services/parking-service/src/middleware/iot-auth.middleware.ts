import { Request, Response, NextFunction } from "express";
import { sendErrorResponse } from "../utils/response.js";

export const authenticateIoT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return sendErrorResponse(
                res,
                "API key is required",
                401,
                "MISSING_API_KEY"
            );
        }

        const validApiKey = process.env.IOT_API_KEY;

        if (!validApiKey) {
            console.error("IOT_API_KEY not configured in environment");
            return sendErrorResponse(
                res,
                "IoT authentication not configured",
                500,
                "CONFIG_ERROR"
            );
        }

        if (apiKey !== validApiKey) {
            return sendErrorResponse(
                res,
                "Invalid API key",
                401,
                "INVALID_API_KEY"
            );
        }

        next();
    } catch (error) {
        console.error("IoT authentication error:", error);
        return sendErrorResponse(
            res,
            "Authentication failed",
            500,
            "AUTH_ERROR"
        );
    }
};
