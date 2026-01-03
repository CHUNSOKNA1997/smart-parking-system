/**
 * PayWay QR Generation Service
 * 
 * This service handles the core PayWay integration:
 * - Generates QR codes for payments
 * - Calls PayWay Generate QR API
 * - Returns QR image, deep link, and transaction details
 * 
 * FLOW:
 * 1. Mobile app requests QR code
 * 2. We call PayWay API with payment details
 * 3. PayWay generates QR code and deep link
 * 4. We return to mobile app
 * 5. User scans QR or opens banking app
 * 6. User pays → PayWay sends webhook to us
 */

import axios, { AxiosInstance } from "axios";
import { PayWayUtils } from "../utils/payway.utils.js";

/**
 * Request parameters for generating QR code
 */
interface GenerateQRRequest {
    bookingId: string;      // Parking booking ID
    amount: number;         // Payment amount (e.g., 5.00)
    currency: string;       // "USD" or "KHR"
    description: string;    // What user is buying (e.g., "Parking Spot A1")
    customerName?: string;  // Optional: User's name
    customerPhone?: string; // Optional: User's phone
    customerEmail?: string; // Optional: User's email
}

/**
 * Response from PayWay Generate QR API
 */
interface PayWayQRResponse {
    status: {
        code: string;      // "0" = success, other = error
        message: string;   // Status message
    };
    qrString: string;      // QR code data string (for scanning)
    qrImage: string;       // Base64 PNG image (data:image/png;base64,...)
    abapay_deeplink: string; // Deep link to open ABA PAY app
}

/**
 * Our formatted response to return to mobile app
 */
interface QRCodeResult {
    tranId: string;        // Transaction ID for tracking
    qrString: string;      // QR code data
    qrImage: string;       // Base64 PNG image
    deeplinkUrl: string;   // Deep link to banking app
    expiresAt: Date;       // When QR code expires
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
        
        // PayWay Generate QR endpoint
        this.generateQrUrl = 
            process.env.PAYWAY_GENERATE_QR_URL || 
            "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr";

        // Validate configuration
        if (!this.merchantId || !this.apiKey) {
            console.error("[PAYWAY] Missing configuration! Check .env file:");
            console.error("- PAYWAY_MERCHANT_ID");
            console.error("- PAYWAY_API_KEY");
            throw new Error("PayWay configuration incomplete");
        }

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

            // Step 5: Generate HMAC-SHA512 hash for security
            // ORDER MATTERS! Must match PayWay's expected order
            const hash = this.generateQRHash(
                reqTime,
                tranId,
                request.amount,
                items,
                request.currency
            );

            // Step 6: Prepare request payload
            const payload = {
                req_time: reqTime,
                merchant_id: this.merchantId,
                tran_id: tranId,
                amount: amountInSmallestUnit,
                items: items,
                currency: request.currency,
                payment_option: "abapay_khqr", // KHQR via ABA PAY
                hash: hash,
                
                // Optional customer information
                ...(request.customerName && {
                    first_name: request.customerName.split(" ")[0],
                    last_name: request.customerName.split(" ").slice(1).join(" ") || "",
                }),
                ...(request.customerPhone && { phone: request.customerPhone }),
                ...(request.customerEmail && { email: request.customerEmail }),
            };

            console.log("[PAYWAY] Calling Generate QR API...");

            // Step 7: Call PayWay Generate QR API
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

            // Step 9: Calculate QR expiration time (15 minutes from now)
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            console.log(`[PAYWAY] QR generated successfully for ${tranId}`);

            // Step 10: Return formatted result
            return {
                tranId: tranId,
                qrString: response.data.qrString,
                qrImage: response.data.qrImage,
                deeplinkUrl: response.data.abapay_deeplink,
                expiresAt: expiresAt,
            };
        } catch (error: any) {
            // Handle errors
            console.error("[PAYWAY] Generate QR failed:", error.message);
            
            if (error.response?.data) {
                // PayWay API returned error
                const apiError = error.response.data;
                throw new Error(
                    `PayWay Error: ${apiError.status?.message || JSON.stringify(apiError)}`
                );
            }
            
            if (error.code === "ECONNABORTED") {
                // Timeout
                throw new Error("PayWay API timeout. Please try again.");
            }
            
            // Generic error
            throw new Error(
                `Failed to generate QR code: ${error.message}`
            );
        }
    }

    /**
     * Generates HMAC-SHA512 hash for Generate QR API
     * 
     * IMPORTANT: The order of fields in hash calculation matters!
     * PayWay expects specific order for Generate QR endpoint.
     * 
     * Hash format for Generate QR:
     * req_time + merchant_id + tran_id + amount + items + currency + payment_option + 
     * first_name + last_name + phone + email
     * 
     * @param reqTime - Formatted timestamp
     * @param tranId - Transaction ID
     * @param amount - Amount in dollars/riel
     * @param items - Base64 encoded items
     * @param currency - "USD" or "KHR"
     * @returns HMAC-SHA512 hash
     */
    private generateQRHash(
        reqTime: string,
        tranId: string,
        amount: number,
        items: string,
        currency: string
    ): string {
        // Convert amount to smallest unit for hash calculation
        const amountInSmallestUnit = PayWayUtils.convertAmount(amount, currency);
        
        // Build hash string (ORDER IS CRITICAL!)
        const dataToHash = 
            reqTime +
            this.merchantId +
            tranId +
            amountInSmallestUnit.toString() +
            items +
            currency +
            "abapay_khqr"; // payment_option

        // Generate HMAC-SHA512
        const crypto = require("crypto");
        const hmac = crypto.createHmac("sha512", this.apiKey);
        hmac.update(dataToHash);
        
        return hmac.digest("base64");
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
