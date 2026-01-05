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
    // Legacy: single booking (kept for backward compatibility)
    bookingId?: string;
    
    // New: multiple bookings support
    bookings?: Array<{
        bookingId: string;
        amount: number;
        description?: string;
    }>;
    
    userId: string;
    amount: number; // Total amount
    currency: PaymentCurrency;
    description?: string;
    paymentMethod?: "payway";
}

export interface CreatePaymentResponse {
    paymentId: string;
    qrString: string;
    qrImage?: string;
    deeplinkUrl: string;
    amount: number;
    currency: string;
    status: string;
    bookings?: Array<{
        bookingId: string;
        amount: number;
    }>;
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
