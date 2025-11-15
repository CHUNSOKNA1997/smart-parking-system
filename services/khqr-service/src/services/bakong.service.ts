/**
 * KHQR Bakong API Service
 * Handles all interactions with Bakong Open API
 */

import axios, { AxiosInstance } from "axios";
import type {
	KHQRRequestTokenRequest,
	KHQRRequestTokenResponse,
	KHQRVerifyTokenRequest,
	KHQRVerifyTokenResponse,
	KHQRRenewTokenRequest,
	KHQRRenewTokenResponse,
	KHQRGenerateDeeplinkRequest,
	KHQRGenerateDeeplinkResponse,
	KHQRCheckTransactionByMD5Request,
	KHQRCheckTransactionByHashRequest,
	KHQRCheckTransactionByShortHashRequest,
	KHQRCheckTransactionResponse,
	KHQRCheckAccountRequest,
	KHQRCheckAccountResponse,
	KHQRErrorResponse,
} from "../types/index.js";

class KHQRBakongService {
	private axiosInstance: AxiosInstance;
	private baseUrl: string;
	private token: string | null = null;

	constructor() {
		// Determine API base URL based on environment (production vs development)
		this.baseUrl = process.env.NODE_ENV === 'production'
			? process.env.BAKONG_PROD_BASE_API_URL || "https://api-bakong.nbc.gov.kh/v1"
			: process.env.BAKONG_DEV_BASE_API_URL || "https://sit-api-bakong.nbc.gov.kh/v1";

		this.token = process.env.BAKONG_ACCESS_TOKEN || null;

		this.axiosInstance = axios.create({
			baseURL: this.baseUrl,
			timeout: 30000,
			// Note: User-Agent header is not overridden to avoid CloudFront blocking.
			// CloudFront blocks custom User-Agents but allows the default axios User-Agent.
		});

		// Request interceptor for logging and debugging API calls
		this.axiosInstance.interceptors.request.use(
			(config) => {
				console.log('[KHQR] Bakong API Request:', {
					method: config.method?.toUpperCase(),
					url: `${config.baseURL}${config.url}`,
					headers: config.headers,
					data: config.data,
				});
				return config;
			},
			(error) => {
				console.error('[KHQR] Request Error:', error);
				return Promise.reject(error);
			}
		);

		// Response interceptor for logging API responses and errors
		this.axiosInstance.interceptors.response.use(
			(response) => {
				console.log('[KHQR] Bakong API Response:', {
					status: response.status,
					data: response.data,
				});
				return response;
			},
			(error) => {
				console.error('[KHQR] Response Error:', {
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
				});
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Sets the authentication token for subsequent API requests.
	 *
	 * @param token - JWT token obtained from Bakong API
	 */
	setToken(token: string): void {
		this.token = token;
	}

	/**
	 * Constructs authorization headers for authenticated API requests.
	 *
	 * @param required - Whether authentication token is required (default: true)
	 * @returns Headers object with Content-Type and optional Authorization
	 * @throws Error if token is required but not available
	 */
	private getAuthHeaders(required: boolean = true): Record<string, string> {
		if (!this.token && required) {
			throw new Error(
				"KHQR token not available. Please authenticate first."
			);
		}
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}
		return headers;
	}

	/**
	 * Registers integrator information with Bakong to obtain an access token.
	 * This is the first step in the Bakong authentication flow.
	 *
	 * @param request - Integrator registration details
	 * @returns Response containing registration status
	 * @throws Error if API request fails
	 */
	async requestToken(
		request: KHQRRequestTokenRequest
	): Promise<KHQRRequestTokenResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRRequestTokenResponse>(
					"/request_token",
					request
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Verifies the OTP code received via email and retrieves the JWT token.
	 * Automatically stores the token if verification is successful.
	 *
	 * @param request - Verification code from email
	 * @returns Response containing JWT token if successful
	 * @throws Error if verification fails
	 */
	async verifyToken(
		request: KHQRVerifyTokenRequest
	): Promise<KHQRVerifyTokenResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRVerifyTokenResponse>(
					"/verify",
					request
				);

			// Automatically store the token if verification is successful
			if (response.data.responseCode === 0 && response.data.data?.token) {
				this.setToken(response.data.data.token);
			}

			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Renews an expired JWT token using the registered email address.
	 * Automatically updates the stored token if renewal is successful.
	 *
	 * @param request - Email address used during registration
	 * @returns Response containing new JWT token
	 * @throws Error if renewal fails
	 */
	async renewToken(
		request: KHQRRenewTokenRequest
	): Promise<KHQRRenewTokenResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRRenewTokenResponse>(
					"/renew_token",
					request
				);

			// Automatically update the stored token if renewal is successful
			if (response.data.responseCode === 0 && response.data.data?.token) {
				this.setToken(response.data.data.token);
			}

			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Generates a mobile deeplink URL from a Bakong KHQR code string.
	 * This endpoint does not require authentication.
	 *
	 * @param request - QR code string and source application information
	 * @returns Response containing deeplink URL
	 * @throws Error if deeplink generation fails
	 */
	async generateDeeplink(
		request: KHQRGenerateDeeplinkRequest
	): Promise<KHQRGenerateDeeplinkResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRGenerateDeeplinkResponse>(
					"/generate_deeplink_by_qr",
					request
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Checks the status of a KHQR transaction using its MD5 hash.
	 * Requires authentication token.
	 *
	 * @param request - MD5 hash of the QR code
	 * @returns Response containing transaction details if found
	 * @throws Error if authentication fails or transaction not found
	 */
	async checkTransactionByMD5(
		request: KHQRCheckTransactionByMD5Request
	): Promise<KHQRCheckTransactionResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRCheckTransactionResponse>(
					"/check_transaction_by_md5",
					request,
					{
						headers: this.getAuthHeaders(),
					}
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Checks the status of a KHQR transaction using its full transaction hash.
	 * Requires authentication token.
	 *
	 * @param request - Full transaction hash
	 * @returns Response containing transaction details if found
	 * @throws Error if authentication fails or transaction not found
	 */
	async checkTransactionByHash(
		request: KHQRCheckTransactionByHashRequest
	): Promise<KHQRCheckTransactionResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRCheckTransactionResponse>(
					"/check_transaction_by_hash",
					request,
					{
						headers: this.getAuthHeaders(),
					}
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Checks the status of a KHQR transaction using its short hash.
	 * Requires authentication token.
	 *
	 * @param request - Short transaction hash
	 * @returns Response containing transaction details if found
	 * @throws Error if authentication fails or transaction not found
	 */
	async checkTransactionByShortHash(
		request: KHQRCheckTransactionByShortHashRequest
	): Promise<KHQRCheckTransactionResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRCheckTransactionResponse>(
					"/check_transaction_by_short_hash",
					request,
					{
						headers: this.getAuthHeaders(),
					}
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Verifies and retrieves information about a Bakong account.
	 * Requires authentication token.
	 *
	 * @param request - Account identifier to check
	 * @returns Response containing account details if found
	 * @throws Error if authentication fails or account not found
	 */
	async checkBakongAccount(
		request: KHQRCheckAccountRequest
	): Promise<KHQRCheckAccountResponse> {
		try {
			const response =
				await this.axiosInstance.post<KHQRCheckAccountResponse>(
					"/check_bakong_account",
					request,
					{
						headers: this.getAuthHeaders(),
					}
				);
			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * Handles and transforms API errors into standardized Error objects.
	 * Detects CloudFront HTML error pages and JSON error responses.
	 *
	 * @param error - Axios error object
	 * @returns Formatted Error with descriptive message
	 */
	private handleError(error: any): Error {
		if (error.response?.data) {
			// Detect CloudFront HTML error pages (blocked requests)
			if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
				const statusCode = error.response.status || 'unknown';
				return new Error(
					`Bakong API Error (${statusCode}): Request blocked by CloudFront. ` +
					`Check your credentials and network access.`
				);
			}

			// Handle JSON error responses from Bakong API
			const errorData = error.response.data as KHQRErrorResponse;
			return new Error(
				errorData.responseMessage ||
					"KHQR API Error: " + JSON.stringify(errorData)
			);
		}
		if (error.message) {
			return new Error(error.message);
		}
		return new Error("Unknown KHQR API error");
	}
}

/**
 * Singleton instance of KHQRBakongService.
 * Use this instance for all Bakong API interactions.
 */
export const khqrBakongService = new KHQRBakongService();
export default KHQRBakongService;
