import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

// Global error handler middleware
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): Response => {
    console.error("ERROR: Error occurred:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Default error status and message
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    return sendError(
        res,
        statusCode,
        message,
        process.env.NODE_ENV === "development" ? err.stack : null
    );
};

// 404 handler
export const notFound = (
    req: Request,
    res: Response,
    next: NextFunction
): Response => {
    return sendError(res, 404, `Route ${req.originalUrl} not found`);
};
