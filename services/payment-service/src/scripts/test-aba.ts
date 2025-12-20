
import { abaService } from "../services/aba.service.js";
import { CreatePaymentRequest } from "../types/index.js";

async function testABA() {
    console.log("Testing ABA PayWay Integration...");

    const request: CreatePaymentRequest = {
        userId: "test-user-id",
        amount: 1.00,
        currency: "USD",
        description: "Test Parking Fee",
        paymentMethod: "aba"
    };

    const transactionId = "T" + Date.now();

    try {
        const result = await abaService.createPurchase(request, transactionId);
        console.log("✅ ABA Purchase Created Successfully!");
        console.log("QR String:", result.qrString);
        console.log("Deeplink:", result.deeplink);
        console.log("Checkout URL:", result.checkoutUrl);
    } catch (error: any) {
        console.error("❌ ABA Purchase Failed:", error.message);
    }
}

testABA();
