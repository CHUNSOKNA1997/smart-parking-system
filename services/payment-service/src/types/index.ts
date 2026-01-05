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
        amount?: number; // Optional: will fetch from booking service if not provided
        description?: string;
    }>;
    
    userId: string;
    amount?: number; // Optional: will be calculated from bookings if not provided
    currency?: PaymentCurrency; // Optional: will fetch from booking if not provided
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
