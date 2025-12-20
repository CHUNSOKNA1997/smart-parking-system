import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

export const authenticateIoT = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return sendError(
                res,
                401,
                "API key is required",
                "MISSING_API_KEY"
            );
        }

        const validApiKey = process.env.IOT_API_KEY;

        if (!validApiKey) {
            console.error("IOT_API_KEY not configured in environment");
            return sendError(
                res,
                500,
                "IoT authentication not configured",
                "CONFIG_ERROR"
            );
        }

        if (apiKey !== validApiKey) {
            return sendError(
                res,
                401,
                "Invalid API key",
                "INVALID_API_KEY"
            );
        }

        next();
    } catch (error) {
        console.error("IoT authentication error:", error);
        return sendError(
            res,
            500,
            "Authentication failed",
            "AUTH_ERROR"
        );
    }
};
