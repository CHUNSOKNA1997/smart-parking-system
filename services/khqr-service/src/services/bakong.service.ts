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
		// Use development or production API URL
		this.baseUrl = process.env.NODE_ENV === 'production'
			? process.env.BAKONG_PROD_BASE_API_URL || "https://api-bakong.nbc.gov.kh/v1"
			: process.env.BAKONG_DEV_BASE_API_URL || "https://sit-api-bakong.nbc.gov.kh/v1";

		this.token = process.env.BAKONG_ACCESS_TOKEN || null;

		this.axiosInstance = axios.create({
			baseURL: this.baseUrl,
			timeout: 30000,
			// Don't override User-Agent - let axios use its default
			// CloudFront blocks custom User-Agents but allows axios default
		});

		// Add request interceptor for debugging
		this.axiosInstance.interceptors.request.use(
			(config) => {
				console.log('🔵 Bakong API Request:', {
					method: config.method?.toUpperCase(),
					url: `${config.baseURL}${config.url}`,
					headers: config.headers,
					data: config.data,
				});
				return config;
			},
			(error) => {
				console.error('🔴 Request Error:', error);
				return Promise.reject(error);
			}
		);

		// Add response interceptor for debugging
		this.axiosInstance.interceptors.response.use(
			(response) => {
				console.log('🟢 Bakong API Response:', {
					status: response.status,
					data: response.data,
				});
				return response;
			},
			(error) => {
				console.error('🔴 Response Error:', {
					status: error.response?.status,
					statusText: error.response?.statusText,
					data: error.response?.data,
				});
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Set token for authenticated requests
	 */
	setToken(token: string): void {
		this.token = token;
	}

	/**
	 * Get authorization headers
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
	 * 1. Request Token
	 * Register integrator information to get access token
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
	 * 2. Verify Token
	 * Verify the code received in email to get the JWT token
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

			// Save token if verification successful
			if (response.data.responseCode === 0 && response.data.data?.token) {
				this.setToken(response.data.data.token);
			}

			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * 3. Renew Token
	 * Renew expired token using registered email
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

			// Update token if renewal successful
			if (response.data.responseCode === 0 && response.data.data?.token) {
				this.setToken(response.data.data.token);
			}

			return response.data;
		} catch (error: any) {
			throw this.handleError(error);
		}
	}

	/**
	 * 4. Generate Deeplink
	 * Generate a deeplink URL from a Bakong QR code string
	 * NOTE: This endpoint does NOT require authentication
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
	 * 5. Check Transaction Status by MD5
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
	 * 6. Check Transaction Status by Full Hash
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
	 * 7. Check Transaction Status by Short Hash
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
	 * 8. Check Bakong Account
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
	 * Error handler
	 */
	private handleError(error: any): Error {
		if (error.response?.data) {
			// Check if error is HTML (CloudFront error pages)
			if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
				const statusCode = error.response.status || 'unknown';
				return new Error(
					`Bakong API Error (${statusCode}): Request blocked by CloudFront. ` +
					`Check your credentials and network access.`
				);
			}

			// Handle JSON error responses
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

// Export singleton instance
export const khqrBakongService = new KHQRBakongService();
export default KHQRBakongService;
