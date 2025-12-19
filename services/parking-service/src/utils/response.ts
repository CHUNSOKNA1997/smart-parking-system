// Standardized API response format
import { Response } from "express";

export const sendSuccess = (
    res: Response,
    statusCode: number = 200,
    message: string,
    data: any = null
): Response => {
    const response: any = {
        success: true,
        message,
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    statusCode: number = 500,
    message: string,
    error: any = null
): Response => {
    const response: any = {
        success: false,
        message,
    };

    if (error !== null && process.env.NODE_ENV === "development") {
        response.error = error;
    }

    return res.status(statusCode).json(response);
};

// Export with both names for compatibility
export const sendSuccessResponse = sendSuccess;
export const sendErrorResponse = sendError;
