/**
 * Script to renew expired Bakong access token
 * Run this when you get "Unauthorized" errors
 */

import "dotenv/config";
import { khqrBakongService } from "./src/services/bakong.service.js";

async function renewToken() {
    console.log("\n========================================");
    console.log("Bakong Token Renewal");
    console.log("========================================\n");

    // You need the email address you used to register with Bakong API
    const email = process.env.BAKONG_REGISTRATION_EMAIL || "";

    if (!email) {
        console.error(
            "❌ Error: BAKONG_REGISTRATION_EMAIL not set in .env file"
        );
        console.log("\nPlease add to your .env file:");
        console.log("BAKONG_REGISTRATION_EMAIL=your_email@example.com");
        return;
    }

    console.log("Requesting token renewal for:", email);
    console.log("This will send a verification code to your email...\n");

    try {
        // Step 1: Request token renewal
        const renewResult = await khqrBakongService.renewToken({
            email: email,
        });

        console.log("✅ Renewal request sent!");
        console.log("Response Code:", renewResult.responseCode);
        console.log("Response Message:", renewResult.responseMessage);

        if (renewResult.responseCode === 0) {
            console.log("\n📧 Check your email for the verification code");
            console.log("\nNext steps:");
            console.log("1. Check your email inbox for the verification code");
            console.log("2. Run: npx tsx verify-bakong-token.ts");
            console.log("3. Enter the code when prompted");
        } else {
            console.error("\n❌ Renewal request failed");
            console.log(
                "You may need to register again using request-bakong-token.ts"
            );
        }
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
        console.log("\nPossible issues:");
        console.log("1. The email is not registered with Bakong API");
        console.log("2. Network connectivity issues");
        console.log("3. Bakong API is down");
        console.log(
            "\nTry registering from scratch with request-bakong-token.ts"
        );
    }

    console.log("\n========================================\n");
}

renewToken();
