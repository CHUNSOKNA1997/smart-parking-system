import type { ApiResponse } from "../types/index.js";

/**
 * Standard success response
 */
export const successResponse = <T>(
    message: string,
    data?: T
): ApiResponse<T> => {
    return {
        success: true,
        message,
        data,
    };
};

/**
 * Standard error response
 */
export const errorResponse = (message: string, error?: string): ApiResponse => {
    return {
        success: false,
        message,
        error,
    };
};

/**
 * Paginated response helper
 */
export const paginatedResponse = <T>(
    data: T[],
    page: number,
    limit: number,
    total: number
) => {
    return {
        success: true,
        message: "Data retrieved successfully",
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
