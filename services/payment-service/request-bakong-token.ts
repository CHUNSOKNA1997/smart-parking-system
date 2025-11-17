/**
 * Script to request initial Bakong API access token
 * Use this if you don't have a token yet or need to re-register
 */

import "dotenv/config";
import { khqrBakongService } from "./src/services/bakong.service.js";

async function requestToken() {
    console.log("\n========================================");
    console.log("Bakong API Token Registration");
    console.log("========================================\n");

    // Registration details
    const registrationData = {
        email: "your_email@example.com",        // Change this
        organization: "Smart Parking System",    // Change this
        project: "Parking Payment Service"      // Change this
    };

    console.log("⚠️  IMPORTANT: Update the registration details in this file first!");
    console.log("\nRegistration details:");
    console.log("- Email:", registrationData.email);
    console.log("- Organization:", registrationData.organization);
    console.log("- Project:", registrationData.project);
    console.log("");

    if (registrationData.email === "your_email@example.com") {
        console.error("❌ Please update the email address in request-bakong-token.ts");
        console.log("\nEdit the file and change:");
        console.log('  email: "your_email@example.com"  →  email: "your_actual_email@example.com"');
        return;
    }

    console.log("Requesting access token from Bakong API...\n");

    try {
        const result = await khqrBakongService.requestToken(registrationData);

        console.log("✅ Request successful!");
        console.log("Response Code:", result.responseCode);
        console.log("Response Message:", result.responseMessage);

        if (result.responseCode === 0) {
            console.log("\n📧 Verification code sent to:", registrationData.email);
            console.log("\nNext steps:");
            console.log("1. Check your email inbox");
            console.log("2. Copy the verification code");
            console.log("3. Run: npx tsx verify-bakong-token.ts");
            console.log("4. Paste the code when prompted");
        } else {
            console.error("\n❌ Request failed");
            console.log("Check if:");
            console.log("- Your email is valid");
            console.log("- You have internet connectivity");
            console.log("- Bakong API is accessible");
        }
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        console.log("\nPossible issues:");
        console.log("1. Network connectivity problems");
        console.log("2. Bakong API is temporarily unavailable");
        console.log("3. Your IP might be blocked");
    }

    console.log("\n========================================\n");
}

requestToken();
