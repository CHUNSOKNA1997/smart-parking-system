export const KHQR_PAYMENT_STATUS = {
	PENDING: "pending",
	PAID: "paid",
	FAILED: "failed",
	CANCELLED: "cancelled",
	REFUNDED: "refunded",
} as const;

export const KHQR_CURRENCY = {
	USD: "USD",
	KHR: "KHR",
} as const;

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const;

export const KHQR_ERROR_MESSAGES = {
	PAYMENT_NOT_FOUND: "Payment not found",
	TRANSACTION_NOT_FOUND: "Transaction not found",
	INVALID_TRANSACTION_HASH: "Invalid transaction hash",
	PAYMENT_ALREADY_VERIFIED: "Payment already verified",
	AMOUNT_MISMATCH: "Transaction amount does not match payment amount",
	CURRENCY_MISMATCH: "Transaction currency does not match payment currency",
	TOKEN_EXPIRED: "KHQR token expired, please renew",
	TOKEN_NOT_FOUND: "KHQR token not configured",
	DEEPLINK_GENERATION_FAILED: "Failed to generate payment deeplink",
	BAKONG_API_ERROR: "Bakong API error",
} as const;
