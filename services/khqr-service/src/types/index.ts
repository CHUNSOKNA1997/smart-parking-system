/**
 * KHQR Service Type Definitions
 * Based on Bakong Open API Documentation v1.0.2
 */

// ============================================================================
// Base Response Types
// ============================================================================

export interface KHQRBaseResponse<T = any> {
	data: T | null;
	errorCode: number | null;
	responseCode: 0 | 1;
	responseMessage: string;
}

export interface KHQRErrorResponse extends KHQRBaseResponse<null> {
	errorCode: number;
	responseCode: 1;
}

// ============================================================================
// Error Codes
// ============================================================================

export enum KHQRErrorCode {
	SUCCESS = 0,
	TRANSACTION_NOT_FOUND = 1,
	STATIC_QR_NOT_SUPPORTED = 2,
	TRANSACTION_FAILED = 3,
	DEEPLINK_ERROR = 4,
	MISSING_FIELDS = 5,
	UNAUTHORIZED = 6,
	EMAIL_SERVER_DOWN = 7,
	EMAIL_ALREADY_REGISTERED = 8,
	CANNOT_CONNECT = 9,
	NOT_REGISTERED = 10,
	ACCOUNT_NOT_FOUND = 11,
}

// ============================================================================
// Token Management Types
// ============================================================================

export interface KHQRRequestTokenRequest {
	email: string;
	organization: string;
	project: string;
}

export interface KHQRRequestTokenResponse extends KHQRBaseResponse<null> {
	responseMessage: "Email has been sent";
}

export interface KHQRVerifyTokenRequest {
	code: string;
}

export interface KHQRTokenData {
	token: string;
}

export interface KHQRVerifyTokenResponse
	extends KHQRBaseResponse<KHQRTokenData> {
	data: KHQRTokenData;
	responseMessage: "Token has been issued";
}

export interface KHQRRenewTokenRequest {
	email: string;
}

export interface KHQRRenewTokenResponse
	extends KHQRBaseResponse<KHQRTokenData> {
	data: KHQRTokenData;
	responseMessage: "Token has been issued";
}

// ============================================================================
// Deeplink Types
// ============================================================================

export interface KHQRSourceInfo {
	appIconUrl: string;
	appName: string;
	appDeepLinkCallback: string;
}

export interface KHQRGenerateDeeplinkRequest {
	qr: string;
	sourceInfo: KHQRSourceInfo;
}

export interface KHQRDeeplinkData {
	shortLink: string;
}

export interface KHQRGenerateDeeplinkResponse
	extends KHQRBaseResponse<KHQRDeeplinkData> {
	data: KHQRDeeplinkData;
	responseMessage: "Getting deep link successfully";
}

// ============================================================================
// Transaction Check Types
// ============================================================================

export interface KHQRCheckTransactionByMD5Request {
	md5: string;
}

export interface KHQRCheckTransactionByHashRequest {
	hash: string;
}

export interface KHQRCheckTransactionByShortHashRequest {
	hash: string;
	amount: number;
	currency: "USD" | "KHR";
}

export interface KHQRTransactionData {
	hash: string;
	fromAccountId: string;
	toAccountId: string;
	currency: string;
	amount: number;
	description?: string;
}

export interface KHQRCheckTransactionResponse
	extends KHQRBaseResponse<KHQRTransactionData> {
	data: KHQRTransactionData | null;
	responseMessage:
		| "Getting transaction successfully."
		| "Transaction failed."
		| "Transaction could not be found. Please check and try again.";
}

// ============================================================================
// Account Check Types
// ============================================================================

export interface KHQRCheckAccountRequest {
	accountId: string;
}

export interface KHQRCheckAccountResponse extends KHQRBaseResponse<null> {
	responseCode: 0 | 1;
	responseMessage: "Account ID exists" | "Account ID not found";
	errorCode: null | 11;
	data: null;
}

// ============================================================================
// Payment Service Types
// ============================================================================

export type KHQRCurrency = "USD" | "KHR";

export type KHQRPaymentStatus =
	| "pending"
	| "paid"
	| "failed"
	| "cancelled"
	| "refunded";

export interface CreatePaymentRequest {
	bookingId?: string;
	userId: string;
	amount: number;
	currency: KHQRCurrency;
	description?: string;
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

export interface VerifyPaymentRequest {
	paymentId: string;
	transactionHash: string;
}

export interface VerifyPaymentResponse {
	paymentId: string;
	status: KHQRPaymentStatus;
	transactionData: KHQRTransactionData;
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
