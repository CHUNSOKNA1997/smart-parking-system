/**
 * Payment Service Type Definitions
 */

// ============================================================================
// Payment Service Types
// ============================================================================

export type PaymentCurrency = "USD" | "KHR";

export type PaymentStatus =
    | "pending"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";

export interface CreatePaymentRequest {
    bookingId?: string;
    userId: string;
    amount: number;
    currency: PaymentCurrency;
    description?: string;
    paymentMethod?: "aba";
}

export interface CreatePaymentResponse {
    paymentId: string;
    qrString: string;
    deeplinkUrl: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
}

export interface VerifyPaymentResponse {
    paymentId: string;
    status: PaymentStatus;
    verifiedAt: Date;
}

// ============================================================================
// API Response Helpers
// ============================================================================

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
