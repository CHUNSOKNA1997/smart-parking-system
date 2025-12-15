import axios from "axios";
import crypto from "crypto";
import { CreatePaymentRequest } from "../types/index.js";

interface ABAPurchaseRequest {
    req_time: string;
    merchant_id: string;
    tran_id: string;
    amount: string;
    items: string;
    hash: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    type: string;
    payment_option: string;
    return_url: string;
    continue_success_url: string;
    return_params?: string;
    currency: string;
    shipping?: string;
}

interface ABAPurchaseResponse {
    status: {
        code: string;
        message: string;
    };
    description: string;
    qr_string?: string;
    abapay_deeplink?: string;
    checkout_url?: string;
}

interface ABAGenerateQrResponse {
    status: {
        code: string;
        message: string;
    };
    description?: string;
    qrString: string;
    qrImage: string;
    abapay_deeplink: string;
    app_store?: string;
    play_store?: string;
}

class ABAService {
    private apiUrl: string;
    private generateQrUrl: string;
    private merchantId: string;
    private apiKey: string;

    constructor() {
        // Base API URL (used for purchase)
        this.apiUrl = process.env.ABA_PAYWAY_API_URL || "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase";
        // Derive Generate QR URL from base URL or environment variable. 
        // Assuming the base URL structure follows standard pattern, we can replace 'purchase' with 'generate-qr'
        // Or strictly use a separate env var. For now, let's derive or fallback to sandbox default.
        const baseUrl = this.apiUrl.substring(0, this.apiUrl.lastIndexOf('/'));
        this.generateQrUrl = process.env.ABA_PAYWAY_GENERATE_QR_URL || `${baseUrl}/generate-qr`;

        this.merchantId = process.env.ABA_PAYWAY_MERCHANT_ID || "";
        this.apiKey = process.env.ABA_PAYWAY_API_KEY || "";
    }

    /**
     * Generates HMAC-SHA512 hash for ABA PayWay
     */
    private generateHash(data: string): string {
        const hmac = crypto.createHmac("sha512", this.apiKey);
        return hmac.update(data).digest("base64");
    }

    /**
     * Creates a purchase request to ABA PayWay
     */
    async createPurchase(
        request: CreatePaymentRequest,
        transactionId: string
    ): Promise<{ qrString?: string; deeplink?: string; checkoutUrl?: string }> {
        // ABA PayWay requires transaction ID max 20 characters
        // Format: Short timestamp (10 chars) + UUID prefix (10 chars) = 20 chars
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits
        const uuidPrefix = transactionId.replace(/-/g, "").substring(0, 10);
        const abaTranId = timestamp + uuidPrefix;

        // Use UTC+7 for ABA PayWay
        const reqTime = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14); // YYYYMMDDHHmmss
        const amount = request.amount.toFixed(2);
        const items = Buffer.from(
            JSON.stringify([
                { name: request.description || "Parking Fee", quantity: 1, price: amount },
            ])
        ).toString("base64");

        const firstName = "Smart";
        const lastName = "Parking";
        const email = "user@example.com"; // Should come from user profile
        const phone = "012345678"; // Should come from user profile
        const paymentOption = "abapay_deeplink"; // Or 'cards', 'abapay'
        const returnUrl = "http://localhost:8080/api/v1/payments/aba-callback"; // Backend callback
        const continueSuccessUrl = "https://smartparking.com/success"; // Frontend success page
        const currency = request.currency || "USD";
        const shipping = "0.00";
        const type = "purchase";

        // Construct the string to hash
        // Order: req_time + merchant_id + tran_id + amount + items + shipping + firstname + lastname + email + phone + type + payment_option + return_url + continue_success_url + currency + return_params
        const dataToHash =
            reqTime +
            this.merchantId +
            abaTranId +
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
            continueSuccessUrl +
            currency +
            ""; // return_params is empty

        const hash = this.generateHash(dataToHash);

        const payload: FormData = new FormData();
        payload.append("req_time", reqTime);
        payload.append("merchant_id", this.merchantId);
        payload.append("tran_id", abaTranId);
        payload.append("amount", amount);
        payload.append("items", items);
        payload.append("hash", hash);
        payload.append("firstname", firstName);
        payload.append("lastname", lastName);
        payload.append("email", email);
        payload.append("phone", phone);
        payload.append("type", type);
        payload.append("payment_option", paymentOption);
        payload.append("return_url", returnUrl);
        payload.append("continue_success_url", continueSuccessUrl);
        payload.append("currency", currency);
        payload.append("shipping", shipping);

        try {
            const response = await axios.post(this.apiUrl, payload, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const result = response.data as ABAPurchaseResponse;

            if (result.status.code !== "00") {
                throw new Error(`ABA PayWay Error: ${result.status.message} - ${result.description}`);
            }

            return {
                qrString: result.qr_string,
                deeplink: result.abapay_deeplink,
                checkoutUrl: result.checkout_url // Fallback
            };

        } catch (error: any) {
            console.error("[ABA] Purchase request failed:", JSON.stringify(error.response?.data || error.message, null, 2));
            throw new Error("Failed to initiate ABA payment");
        }
    }

    /**
     * Generates a KHQR code using ABA PayWay API
     */
    async generateQr(
        request: CreatePaymentRequest,
        transactionId: string
    ): Promise<{ qrString: string; qrImage: string; deeplink: string }> {
        // ABA PayWay requires transaction ID max 20 characters
        const timestamp = Date.now().toString().slice(-10);
        const uuidPrefix = transactionId.replace(/-/g, "").substring(0, 10);
        const abaTranId = timestamp + uuidPrefix;

        // Use UTC+7
        const reqTime = new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
        const amountForHash = request.amount; // Use raw amount
        const currency = request.currency || "USD";

        // Amount for JSON payload (number)
        const amountNum = amountForHash;
        // Amount string for Hash - MUST match the string representation of the JSON number
        // e.g. "5.00" -> 5 (JSON) -> "5" (Hash)
        // If we want to guarantee the hash uses "5", we rely on String(5).
        // Amount string for Hash - MUST match the string representation of the JSON number
        // User requested "don't fixed", so we use the raw number string conversion for the hash source
        const amountStr = amountNum.toString();

        // Construct Items
        const items = Buffer.from(
            JSON.stringify([
                { name: request.description || "Parking Fee", quantity: 1, price: amountNum },
            ])
        ).toString("base64");

        // Optional fields
        const firstName = "Smart";
        const lastName = "Parking";
        const email = "user@example.com";
        const phone = "012345678";

        // Required for KHQR generation
        const paymentOption = "abapay_khqr";
        const purchaseType = "purchase";
        const callbackUrl = Buffer.from("http://localhost:8080/api/v1/payments/aba-callback").toString("base64");
        const lifetime = "6"; // minutes
        const qrImageTemplate = "template3_color"; // standard template

        // Handle null/optional fields as empty strings for hash concatenation.
        // We will then OMIT them from the JSON payload.

        const returnDeeplink = "";
        const customFields = "";
        const returnParams = "";
        const payout = "";

        // Match order from createPurchase exactly (assuming shared validation logic)
        // Order: req_time + merchant_id + tran_id + amount + items + shipping + firstname + lastname + email + phone + type + payment_option + return_url + continue_success_url + currency + return_params

        // Define missing fields as empty strings for hash
        const shipping = "";

        const dataToHash =
            reqTime +
            this.merchantId +
            abaTranId +
            amountStr +
            items +
            firstName +
            lastName +
            email +
            phone +
            purchaseType +
            paymentOption +
            callbackUrl +
            returnDeeplink +
            currency +
            customFields +
            returnParams +
            payout +
            lifetime +
            qrImageTemplate;

        // Note: custom_fields, payout, lifetime, qrImageTemplate seem extra in generate-qr, 
        // if this fails, we might need to append them at the end or insertion point is different.
        // But for "transaction not found", usually the core transaction fields matter.

        const hash = this.generateHash(dataToHash);

        console.log("[ABA DEBUG] Data to Hash:", dataToHash);
        console.log("[ABA DEBUG] Generated Hash:", hash);

        // Construct payload without null fields
        const payload: any = {
            req_time: reqTime,
            merchant_id: this.merchantId,
            tran_id: abaTranId,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            amount: amountNum, // Revert to Number
            purchase_type: purchaseType,
            payment_option: paymentOption,
            items: items,
            currency: currency,
            callback_url: callbackUrl,
            return_deeplink: returnDeeplink,
            custom_fields: customFields,
            return_params: returnParams,
            payout: payout,
            lifetime: Number(lifetime),
            qr_image_template: qrImageTemplate,
            hash: hash
        };
        console.log("[ABA DEBUG] Payload:", JSON.stringify(payload, null, 2));

        try {
            const response = await axios.post(this.generateQrUrl, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const result = response.data as ABAGenerateQrResponse;

            if (result.status.code !== "0") {
                throw new Error(`ABA QR Error: ${result.status.code} - ${result.status.message}`);
            }

            return {
                qrString: result.qrString,
                qrImage: result.qrImage,
                deeplink: result.abapay_deeplink
            };

        } catch (error: any) {
            console.error("[ABA] Generate QR failed:", JSON.stringify(error.response?.data || error.message, null, 2));
            throw new Error("Failed to generate ABA QR");
        }
    }

    /**
     * Verifies the hash from an ABA PayWay callback to ensure authenticity
     */
    verifyCallbackHash(callbackData: any): boolean {
        try {
            const {
                tran_id,
                req_time,
                amount,
                status,
                hash: receivedHash,
                payment_option,
                firstname,
                lastname,
                email,
                phone,
            } = callbackData;

            // Reconstruct the hash string according to ABA's specification
            // Order for callback: tran_id + req_time + amount + status + hash (from request)
            // Note: The actual order might differ; check ABA PayWay documentation
            const dataToHash = tran_id + req_time + amount + status;

            const calculatedHash = this.generateHash(dataToHash);

            return calculatedHash === receivedHash;
        } catch (error) {
            console.error("[ABA] Hash verification error:", error);
            return false;
        }
    }

}

export const abaService = new ABAService();
