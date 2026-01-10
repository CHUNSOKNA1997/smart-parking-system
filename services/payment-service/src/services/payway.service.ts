/**
 * PayWay Payment Service
 *
 * This service handles PayWay payment integrations:
 * - KHQR (QR code payments via ABA Pay, Bakong, etc.)
 * - Credit Cards (Visa, Mastercard, etc.)
 * - Alipay, WeChat Pay, etc.
 *
 * FLOW:
 * 1. Mobile app requests payment
 * 2. We call PayWay Purchase API with payment details
 * 3. PayWay returns checkout_url
 * 4. Mobile app displays checkout page
 * 5. User completes payment → PayWay sends webhook to us
 */

import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { PayWayUtils } from "../utils/payway.utils.js";

/**
 * Request parameters for generating payment
 */
interface GeneratePaymentRequest {
    bookingId: string; // Parking booking ID
    amount: number; // Payment amount (e.g., 5.00)
    currency: string; // "USD" or "KHR"
    description: string; // What user is buying (e.g., "Parking Spot A1")
    customerName?: string; // Optional: User's name
    customerPhone?: string; // Optional: User's phone
    customerEmail?: string; // Optional: User's email
    paymentOption?: string; // "abapay", "cards", "alipay", "wechat", etc.
    qrImageTemplate?: string; // Optional: PayWay QR image template
}

/**
 * Response from PayWay Purchase API
 */
interface PayWayResponse {
    status: {
        code: string; // "0" = success, other = error
        message: string; // Status message
    };
    qrString?: string; // KHQR code string (for QR display)
    qrImage?: string; // Base64 QR code image
    abapay_deeplink?: string; // Deep link to ABA Pay app
    tran_id: string; // Transaction ID
}

/**
 * Our formatted response to return to mobile app
 */
interface PaymentResult {
    tranId: string; // Transaction ID for tracking
    qrString?: string; // KHQR code string (for QR display)
    qrImage?: string; // Base64 QR code image
    deeplink?: string; // Deep link to ABA Pay app
    expiresAt: Date; // When payment expires
}

/**
 * PayWay Service
 *
 * Handles all PayWay payment methods (KHQR, Cards, Alipay, etc.)
 */
export class PayWayService {
    private axiosInstance: AxiosInstance;
    private merchantId: string;
    private apiKey: string;
    private generateQrUrl: string;
    private webhookBaseUrl: string;

    constructor() {
        // Load configuration from environment variables
        this.merchantId = process.env.PAYWAY_MERCHANT_ID || "";
        this.apiKey = process.env.PAYWAY_API_KEY || "";
        this.webhookBaseUrl = process.env.PAYWAY_WEBHOOK_BASE_URL || "";

        // PayWay API endpoints
        // NOTE: There are TWO different endpoints:
        // 1. /purchase - For full checkout (NO template support)
        // 2. /generate-qr - For direct QR generation (WITH template support)
        this.generateQrUrl =
            process.env.PAYWAY_GENERATE_QR_URL ||
            "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr";

        // Validate configuration
        if (!this.merchantId || !this.apiKey) {
            console.error("[payway] Missing configuration! Check .env file:");
            console.error("- PAYWAY_MERCHANT_ID");
            console.error("- PAYWAY_API_KEY");
            throw new Error("PayWay configuration incomplete");
        }

        console.log("[payway] Initialized with:");
        console.log("- Merchant ID:", this.merchantId);
        console.log("- API URL:", this.generateQrUrl);
        console.log("- Webhook Base URL:", this.webhookBaseUrl || "Not configured (localhost only)");

        // Create axios instance for API calls
        this.axiosInstance = axios.create({
            timeout: 30000, // 30 second timeout
        });

        // Log requests for debugging (in development only)
        if (process.env.NODE_ENV !== "production") {
            this.axiosInstance.interceptors.request.use(
                (config) => {
                    console.log("[payway] API Request:", {
                        url: config.url,
                        method: config.method?.toUpperCase(),
                    });
                    return config;
                },
                (error) => {
                    console.error("[payway] Request Error:", error);
                    return Promise.reject(error);
                }
            );

            this.axiosInstance.interceptors.response.use(
                (response) => {
                    console.log("[payway] API Response:", {
                        status: response.status,
                        statusCode: response.data?.status?.code,
                    });
                    return response;
                },
                (error) => {
                    console.error("[payway] Response Error:", {
                        status: error.response?.status,
                        data: error.response?.data,
                    });
                    return Promise.reject(error);
                }
            );
        }
    }

    /**
     * Generates QR code for payment
     *
     * WHAT IT DOES:
     * 1. Generates unique transaction ID
     * 2. Calculates HMAC hash for security
     * 3. Calls PayWay Generate QR API
     * 4. Returns QR image and deep link
     *
     * FLOW:
     * Mobile App → generateQR() → PayWay API → QR Code + Deep Link
     *
     * @param request - Payment details
     * @returns QR code, image, and deep link
     *
     * @example
     * const result = await payWayQRService.generateQR({
     *   bookingId: "abc-123",
     *   amount: 5.00,
     *   currency: "USD",
     *   description: "Parking Spot A1 - 2 hours"
     * });
     * // Returns: { tranId, qrString, qrImage, deeplinkUrl, expiresAt }
     */
    async generateQR(request: GeneratePaymentRequest): Promise<PaymentResult> {
        try {
            // Step 1: Generate unique transaction ID
            const tranId = PayWayUtils.generateTransactionId(request.bookingId);
            console.log(`[payway] Generating QR for transaction: ${tranId}`);

            // Step 2: Get Unix timestamp (NOT formatted string!)
            const reqTime = Math.floor(Date.now() / 1000); // Unix timestamp

            // Step 3: Convert amount to smallest unit (cents for USD)
            const amountInSmallestUnit = PayWayUtils.convertAmount(
                request.amount,
                request.currency
            );

            // Step 4: Generate items array (base64 encoded)
            const items = PayWayUtils.generateItems(
                request.description,
                amountInSmallestUnit
            );

            // Step 5: Define all required fields
            const shipping = "0";
            const firstName = request.customerName?.split(" ")[0] || "";
            const lastName = request.customerName?.split(" ").slice(1).join(" ") || "";
            const email = request.customerEmail || "";
            const phone = request.customerPhone || "";
            const type = "purchase";
            const paymentOption = "abapay";
            
            // Build webhook URL from environment variable
            const returnUrl = this.webhookBaseUrl 
                ? `${this.webhookBaseUrl}/api/v1/payments/webhook/payway`
                : "https://your-app.com/api/payway/webhook"; // Fallback (won't work)
            
            const cancelUrl = "";
            const continueUrl = this.webhookBaseUrl 
                ? `${this.webhookBaseUrl}/payment/success`
                : "https://your-app.com/payment/success";
            const returnDeeplink = "";
            const currency = request.currency;
            const customFields = "";
            const returnParams = ""; // Can encode booking info here if needed

            // Step 6: Generate HMAC-SHA512 hash with ALL fields
            // NOTE: qr_image_template is NOT supported by PayWay Purchase API
            const hash = this.generateQRHash(
                reqTime,
                tranId,
                amountInSmallestUnit.toString(),
                items,
                shipping,
                firstName,
                lastName,
                email,
                phone,
                type,
                paymentOption,
                returnUrl,
                cancelUrl,
                continueUrl,
                returnDeeplink,
                currency,
                customFields,
                returnParams
            );

            // Step 7: Prepare request payload for Purchase API (FORM DATA FORMAT)
            const payload: Record<string, string> = {
                req_time: reqTime.toString(),
                merchant_id: this.merchantId,
                tran_id: tranId,
                amount: amountInSmallestUnit.toString(),
                items: items,
                shipping: shipping,
                firstname: firstName,
                lastname: lastName,
                email: email,
                phone: phone,
                payment_option: paymentOption,
                type: type,
                return_url: returnUrl,
                cancel_url: cancelUrl,
                continue_success_url: continueUrl,
                return_deeplink: returnDeeplink,
                currency: currency,
                custom_fields: customFields,
                return_params: returnParams,
                hash: hash,
            };

            console.log("[payway] Calling Purchase API...");
            console.log("[payway] Note: qr_image_template not supported by Purchase API - PayWay returns raw QR");
            console.log("[payway] Payload (without template):", JSON.stringify(payload, null, 2));

            // Step 8: Call PayWay Purchase API with FORM DATA (not JSON!)
            const response = await this.axiosInstance.post<PayWayResponse>(
                this.generateQrUrl,
                new URLSearchParams(payload as any).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            // Step 9: Check response status
            // PayWay success codes: "0" or "00"
            const statusCode = response.data.status?.code || '';
            const isSuccess = statusCode === "0" || statusCode === "00";
            
            if (!isSuccess) {
                throw new Error(
                    `PayWay API Error: ${response.data.status.code} - ${response.data.status.message}`
                );
            }

            console.log(`[payway] PayWay Response:`, JSON.stringify(response.data, null, 2));

            // Step 10: Calculate expiration time (15 minutes from now)
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            console.log(`[payway] Payment created successfully for ${tranId}`);
            console.log(`[payway] QR String: ${response.data.qrString ? 'Present' : 'Missing'}`);
            console.log(`[payway] QR Image: ${response.data.qrImage ? `Present (${response.data.qrImage.length} chars)` : 'Missing'}`);
            console.log(`[payway] Deeplink: ${response.data.abapay_deeplink || 'N/A'}`);

            // Step 11: Return formatted result
            return {
                tranId: tranId,
                qrString: response.data.qrString,
                qrImage: response.data.qrImage,
                deeplink: response.data.abapay_deeplink,
                expiresAt: expiresAt,
            };
        } catch (error: any) {
            // Handle errors
            console.error("[payway] Generate QR failed:", error.message);

            if (error.response?.data) {
                // PayWay API returned error
                const apiError = error.response.data;
                console.error("[payway] API Error Details:", JSON.stringify(apiError, null, 2));
                throw new Error(
                    `PayWay Error: ${
                        apiError.status?.message || JSON.stringify(apiError)
                    }`
                );
            }

            if (error.code === "ECONNABORTED") {
                // Timeout
                throw new Error("PayWay API timeout. Please try again.");
            }

            // Generic error
            throw new Error(`Failed to generate QR code: ${error.message}`);
        }
    }

    /**
     * Generates HMAC-SHA512 hash for Purchase API
     *
     * Based on working Laravel implementation.
     * Hash includes required fields in exact order.
     *
     * NOTE: qr_image_template is NOT included because PayWay's Purchase API
     * does not support styled QR templates. It always returns a plain B&W QR code.
     *
     * @param reqTime - Unix timestamp (not formatted string!)
     * @param tranId - Transaction ID
     * @param amount - Amount in cents as string
     * @param items - Base64 encoded items
     * @param shipping - Shipping cost (usually 0)
     * @param firstName - Customer first name
     * @param lastName - Customer last name
     * @param email - Customer email
     * @param phone - Customer phone
     * @param type - Always "purchase"
     * @param paymentOption - Payment method (e.g., "abapay")
     * @param returnUrl - Webhook callback URL
     * @param cancelUrl - Cancel URL (empty string)
     * @param continueUrl - Success URL
     * @param returnDeeplink - Mobile deep link (empty string)
     * @param currency - "USD" or "KHR"
     * @param customFields - Custom fields (empty string)
     * @param returnParams - Base64 encoded return params
     * @returns HMAC-SHA512 hash (base64)
     */
    private generateQRHash(
        reqTime: number,
        tranId: string,
        amount: string,
        items: string,
        shipping: string,
        firstName: string,
        lastName: string,
        email: string,
        phone: string,
        type: string,
        paymentOption: string,
        returnUrl: string,
        cancelUrl: string,
        continueUrl: string,
        returnDeeplink: string,
        currency: string,
        customFields: string,
        returnParams: string
    ): string {
        // Build hash string - ALL REQUIRED FIELDS IN EXACT ORDER!
        const payout = '';
        const lifetime = '';
        const additionalParams = '';
        const googlePayToken = '';

        const dataToHash =
            reqTime.toString() +
            this.merchantId +
            tranId +
            amount +
            items +
            shipping +
            firstName +
            lastName +
            email +
            phone +
            type +
            paymentOption +
            returnUrl +
            cancelUrl +
            continueUrl +
            returnDeeplink +
            currency +
            customFields +
            returnParams +
            payout +
            lifetime +
            additionalParams +
            googlePayToken;

        console.log(`[payway] Hash string (first 100 chars): ${dataToHash.substring(0, 100)}...`);

        // Generate HMAC-SHA512 with BINARY output (true parameter)
        const hmac = crypto.createHmac("sha512", this.apiKey);
        hmac.update(dataToHash);
        const binaryHash = hmac.digest(); // Get binary, not base64!

        // Then base64 encode the binary hash
        const hash = binaryHash.toString('base64');
        console.log(`[payway] Generated hash: ${hash}`);

        return hash;
    }

    /**
     * Validates configuration
     *
     * Call this on startup to ensure all required config is present
     *
     * @returns Validation result with errors if any
     */
    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.merchantId) {
            errors.push("PAYWAY_MERCHANT_ID is not configured");
        }

        if (!this.apiKey) {
            errors.push("PAYWAY_API_KEY is not configured");
        }

        if (!this.generateQrUrl) {
            errors.push("PAYWAY_GENERATE_QR_URL is not configured");
        }

        return {
            valid: errors.length === 0,
            errors: errors,
        };
    }
}

/**
 * Singleton instance
 *
 * Use this instead of creating new instances:
 * import { payWayService } from './payway.service'
 * payWayService.generateQR(...)
 */
export const payWayService = new PayWayService();

// Legacy export for backward compatibility
export const payWayQRService = payWayService;
