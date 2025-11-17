export const KHQR_PAYMENT_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
    EXPIRED: "expired",
} as const;

export const KHQR_CURRENCY = {
    USD: "USD",
    KHR: "KHR",
} as const;
