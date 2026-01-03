/**
 * PayWay Utility Functions
 * 
 * This file contains helper functions for PayWay integration:
 * - HMAC-SHA512 hash generation (for security)
 * - Amount conversion (to smallest currency unit)
 * - Transaction ID generation
 * - Webhook signature verification
 */

import crypto from "crypto";

export class PayWayUtils {
    /**
     * Generates HMAC-SHA512 hash for PayWay API requests
     * 
     * WHY? PayWay requires a "signature" to prove the request is authentic.
     * This prevents someone from tampering with the payment amount.
     * 
     * HOW IT WORKS:
     * 1. Combine: reqTime + merchantId + tranId + amount
     * 2. Hash this string using your secret key
     * 3. PayWay will do the same calculation
     * 4. If hashes match → Request is authentic ✅
     * 
     * @param reqTime - Unix timestamp (e.g., "1736156789")
     * @param merchantId - Your PayWay merchant ID
     * @param tranId - Unique transaction ID
     * @param amount - Payment amount in dollars (e.g., 5.00)
     * @param secretKey - Your PayWay API secret key
     * @returns Base64 encoded hash string
     * 
     * @example
     * const hash = PayWayUtils.generateHash(
     *   "1736156789",
     *   "dev_123456",
     *   "booking-abc-1736156789",
     *   5.00,
     *   "your-secret-key"
     * );
     * // Returns: "abc123def456..." (long base64 string)
     */
    static generateHash(
        reqTime: string,
        merchantId: string,
        tranId: string,
        amount: number,
        secretKey: string
    ): string {
        // Convert amount to smallest unit (cents for USD, riel for KHR)
        const amountStr = Math.round(amount * 100).toString();
        
        // Build the string to hash (ORDER MATTERS!)
        const dataToHash = `${reqTime}${merchantId}${tranId}${amountStr}`;
        
        // Generate HMAC-SHA512 hash
        const hmac = crypto.createHmac("sha512", secretKey);
        hmac.update(dataToHash);
        
        // Return as base64 string
        return hmac.digest("base64");
    }

    /**
     * Verifies webhook signature from PayWay
     * 
     * WHY? When PayWay sends a webhook, anyone could fake it!
     * We verify the signature to ensure it's really from PayWay.
     * 
     * HOW IT WORKS:
     * 1. PayWay sends: { tran_id, amount, status, hash }
     * 2. We recalculate hash using our secret key
     * 3. Compare our hash with received hash
     * 4. If they match → Webhook is authentic ✅
     * 
     * @param payload - Webhook data from PayWay
     * @param receivedHash - Hash sent by PayWay
     * @param secretKey - Your PayWay API secret key
     * @returns true if signature is valid, false otherwise
     * 
     * @example
     * const isValid = PayWayUtils.verifyWebhookSignature(
     *   { req_time: "1736156789", merchant_id: "dev_123456", ... },
     *   "abc123def456...",
     *   "your-secret-key"
     * );
     * if (isValid) {
     *   // Process payment
     * } else {
     *   // Reject! Possible fraud attempt
     * }
     */
    static verifyWebhookSignature(
        payload: any,
        receivedHash: string,
        secretKey: string
    ): boolean {
        const { req_time, merchant_id, tran_id, amount } = payload;
        
        // Recalculate the hash
        const expectedHash = this.generateHash(
            req_time,
            merchant_id,
            tran_id,
            parseFloat(amount) / 100, // Convert back from cents
            secretKey
        );
        
        // Compare hashes (timing-safe comparison to prevent timing attacks)
        return crypto.timingSafeEqual(
            Buffer.from(expectedHash),
            Buffer.from(receivedHash)
        );
    }

    /**
     * Generates unique transaction ID
     * 
     * WHY? Each payment needs a unique identifier to track it.
     * Format: booking-{bookingId}-{timestamp}
     * 
     * @param bookingId - The parking booking ID
     * @returns Unique transaction ID
     * 
     * @example
     * const tranId = PayWayUtils.generateTransactionId("abc-123");
     * // Returns: "booking-abc-123-1736156789"
     */
    static generateTransactionId(bookingId: string): string {
        const timestamp = Date.now();
        return `booking-${bookingId}-${timestamp}`;
    }

    /**
     * Converts amount to PayWay format (smallest currency unit)
     * 
     * WHY? PayWay expects amounts in cents (USD) or riel (KHR).
     * - USD: $5.00 → 500 cents
     * - KHR: ៛4,100 → 4100 riel (no decimals)
     * 
     * @param amount - Amount in dollars/riel
     * @param currency - "USD" or "KHR"
     * @returns Amount in smallest unit
     * 
     * @example
     * PayWayUtils.convertAmount(5.00, "USD")  // Returns: 500
     * PayWayUtils.convertAmount(4100, "KHR")  // Returns: 4100
     */
    static convertAmount(amount: number, currency: string): number {
        if (currency === "KHR") {
            return Math.round(amount); // KHR has no decimals
        }
        return Math.round(amount * 100); // USD to cents
    }

    /**
     * Converts amount back from smallest unit to dollars/riel
     * 
     * WHY? When we receive webhook, amount is in cents.
     * We need to convert back for display and database storage.
     * 
     * @param amount - Amount in smallest unit (cents/riel)
     * @param currency - "USD" or "KHR"
     * @returns Amount in dollars/riel
     * 
     * @example
     * PayWayUtils.convertFromSmallestUnit(500, "USD")  // Returns: 5.00
     * PayWayUtils.convertFromSmallestUnit(4100, "KHR") // Returns: 4100
     */
    static convertFromSmallestUnit(amount: number, currency: string): number {
        if (currency === "KHR") {
            return amount; // KHR has no decimals
        }
        return amount / 100; // Cents to dollars
    }

    /**
     * Formats current time for PayWay API
     * 
     * WHY? PayWay requires time in specific format: YYYYMMDDHHmmss
     * Plus, PayWay uses Cambodia timezone (UTC+7)
     * 
     * @returns Formatted timestamp string
     * 
     * @example
     * PayWayUtils.formatReqTime()
     * // Returns: "20240103143000" (YYYY-MM-DD HH:mm:ss in Cambodia time)
     */
    static formatReqTime(): string {
        // Get current time in Cambodia timezone (UTC+7)
        const now = new Date();
        const cambodiaTime = new Date(now.getTime() + 7 * 3600 * 1000);
        
        // Format: YYYYMMDDHHmmss
        return cambodiaTime
            .toISOString()
            .replace(/[-:T.Z]/g, "")
            .slice(0, 14);
    }

    /**
     * Generates items array for PayWay API
     * 
     * WHY? PayWay requires an "items" field describing what user is buying.
     * This is base64-encoded JSON array.
     * 
     * @param description - What user is buying (e.g., "Parking Spot A1")
     * @param amount - Price in smallest unit (cents/riel)
     * @returns Base64 encoded items string
     * 
     * @example
     * PayWayUtils.generateItems("Parking Spot A1", 500)
     * // Returns: "W3sibmFtZSI6IlBhcmtpbmcgU3BvdCBBMSIsInF1YW50aXR5IjoxLCJwcmljZSI6NTAwfV0="
     */
    static generateItems(description: string, amount: number): string {
        const items = [
            {
                name: description,
                quantity: 1,
                price: amount,
            },
        ];
        
        return Buffer.from(JSON.stringify(items)).toString("base64");
    }
}
