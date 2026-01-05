/**
 * PayWay QR Generation Service
 *
 * This service handles the core PayWay integration:
 * - Generates QR codes for payments using Purchase API
 * - Returns checkout URL which contains QR code
 * - User can scan or use deep link to pay
 *
 * FLOW:
 * 1. Mobile app requests payment
 * 2. We call PayWay Purchase API with payment details
 * 3. PayWay returns checkout_url
 * 4. Mobile app displays checkout page (contains QR code)
 * 5. User pays → PayWay sends webhook to us
 */

import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { PayWayUtils } from "../utils/payway.utils.js";

/**
 * Request parameters for generating QR code
 */
interface GenerateQRRequest {
    bookingId: string; // Parking booking ID
    amount: number; // Payment amount (e.g., 5.00)
    currency: string; // "USD" or "KHR"
    description: string; // What user is buying (e.g., "Parking Spot A1")
    customerName?: string; // Optional: User's name
    customerPhone?: string; // Optional: User's phone
    customerEmail?: string; // Optional: User's email
}

/**
 * Response from PayWay Purchase API
 */
interface PayWayQRResponse {
    status: {
        code: string; // "0" = success, other = error
        message: string; // Status message
    };
    checkout_url: string; // URL to PayWay checkout page (contains QR code)
    tran_id: string; // Transaction ID
}

/**
 * Our formatted response to return to mobile app
 */
interface QRCodeResult {
    tranId: string; // Transaction ID for tracking
    checkoutUrl: string; // URL to PayWay checkout page
    expiresAt: Date; // When payment expires
}

/**
 * PayWay QR Service
 *
 * This class handles all interactions with PayWay Generate QR API
 */
export class PayWayQRService {
    private axiosInstance: AxiosInstance;
    private merchantId: string;
    private apiKey: string;
    private generateQrUrl: string;

    constructor() {
        // Load configuration from environment variables
        this.merchantId = process.env.PAYWAY_MERCHANT_ID || "";
        this.apiKey = process.env.PAYWAY_API_KEY || "";

        // PayWay Purchase API endpoint (from your credentials)
        this.generateQrUrl =
            process.env.PAYWAY_API_URL ||
            "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase";

        // Validate configuration
        if (!this.merchantId || !this.apiKey) {
            console.error("[PAYWAY] Missing configuration! Check .env file:");
            console.error("- PAYWAY_MERCHANT_ID");
            console.error("- PAYWAY_API_KEY");
            throw new Error("PayWay configuration incomplete");
        }

        console.log("[PAYWAY] Initialized with:");
        console.log("- Merchant ID:", this.merchantId);
        console.log("- API URL:", this.generateQrUrl);

        // Create axios instance for API calls
        this.axiosInstance = axios.create({
            timeout: 30000, // 30 second timeout
        });

        // Log requests for debugging (in development only)
        if (process.env.NODE_ENV !== "production") {
            this.axiosInstance.interceptors.request.use(
                (config) => {
                    console.log("[PAYWAY] API Request:", {
                        url: config.url,
                        method: config.method?.toUpperCase(),
                    });
                    return config;
                },
                (error) => {
                    console.error("[PAYWAY] Request Error:", error);
                    return Promise.reject(error);
                }
            );

            this.axiosInstance.interceptors.response.use(
                (response) => {
                    console.log("[PAYWAY] API Response:", {
                        status: response.status,
                        statusCode: response.data?.status?.code,
                    });
                    return response;
                },
                (error) => {
                    console.error("[PAYWAY] Response Error:", {
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
    async generateQR(request: GenerateQRRequest): Promise<QRCodeResult> {
        try {
            // Step 1: Generate unique transaction ID
            const tranId = PayWayUtils.generateTransactionId(request.bookingId);
            console.log(`[PAYWAY] Generating QR for transaction: ${tranId}`);

            // Step 2: Format timestamp (Cambodia timezone)
            const reqTime = PayWayUtils.formatReqTime();

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

            // Step 5: Define return URLs
            const returnUrl = "https://your-app.com/payment/success";
            const continueSuccessUrl = "https://your-app.com/payment/success";
            const cancelUrl = "https://your-app.com/payment/cancel";

            // Step 6: Generate HMAC-SHA512 hash for security
            // Hash and payload MUST use same amount format
            const hash = this.generateQRHash(
                reqTime,
                tranId,
                amountInSmallestUnit.toString() // Use cents: "500"
            );

            // Step 7: Prepare request payload for Purchase API
            const payload = {
                req_time: reqTime,
                merchant_id: this.merchantId,
                tran_id: tranId,
                amount: amountInSmallestUnit.toString(),
                items: items,
                return_url: returnUrl,
                continue_success_url: continueSuccessUrl,
                cancel_url: cancelUrl,
                currency: request.currency,
                payment_option: "abapay", // or "cards" for credit card
                hash: hash,

                // Optional customer information
                ...(request.customerName && {
                    first_name: request.customerName.split(" ")[0],
                    last_name:
                        request.customerName.split(" ").slice(1).join(" ") ||
                        "",
                }),
                ...(request.customerPhone && { phone: request.customerPhone }),
                ...(request.customerEmail && { email: request.customerEmail }),
            };

            console.log("[PAYWAY] Calling Purchase API...");
            console.log("[PAYWAY] Payload:", JSON.stringify(payload, null, 2));

            // Step 7: Call PayWay Purchase API
            const response = await this.axiosInstance.post<PayWayQRResponse>(
                this.generateQrUrl,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            // Step 8: Check response status
            if (response.data.status.code !== "0") {
                throw new Error(
                    `PayWay API Error: ${response.data.status.code} - ${response.data.status.message}`
                );
            }

            // Step 9: Calculate expiration time (15 minutes from now)
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            console.log(`[PAYWAY] Payment created successfully for ${tranId}`);
            console.log(`[PAYWAY] Checkout URL: ${response.data.checkout_url}`);

            // Step 10: Return formatted result
            return {
                tranId: tranId,
                checkoutUrl: response.data.checkout_url,
                expiresAt: expiresAt,
            };
        } catch (error: any) {
            // Handle errors
            console.error("[PAYWAY] Generate QR failed:", error.message);

            if (error.response?.data) {
                // PayWay API returned error
                const apiError = error.response.data;
                console.error("[PAYWAY] API Error Details:", JSON.stringify(apiError, null, 2));
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
     * According to PayWay Purchase API documentation:
     * Hash = req_time + merchant_id + tran_id + amount
     * 
     * NOTE: URLs and other fields are NOT included in hash
     *
     * @param reqTime - Formatted timestamp
     * @param tranId - Transaction ID
     * @param amount - Amount as string
     * @returns HMAC-SHA512 hash
     */
    private generateQRHash(
        reqTime: string,
        tranId: string,
        amount: string
    ): string {
        // Build hash string (ORDER IS CRITICAL!)
        // PayWay Purchase hash: ONLY req_time + merchant_id + tran_id + amount
        const dataToHash =
            reqTime +
            this.merchantId +
            tranId +
            amount;

        console.log(`[PAYWAY] Hash string: ${dataToHash}`);

        // Generate HMAC-SHA512
        const hmac = crypto.createHmac("sha512", this.apiKey);
        hmac.update(dataToHash);

        const hash = hmac.digest("base64");
        console.log(`[PAYWAY] Generated hash: ${hash}`);

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
 * import { payWayQRService } from './payway-qr.service'
 * payWayQRService.generateQR(...)
 */
export const payWayQRService = new PayWayQRService();
