/**
 * Script to verify the code sent to your email and get the access token
 */

import "dotenv/config";
import { khqrBakongService } from "./src/services/bakong.service.js";
import * as readline from "readline";

async function verifyToken() {
    console.log("\n========================================");
    console.log("Bakong Token Verification");
    console.log("========================================\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    };

    try {
        const code = await askQuestion("Enter the verification code from your email: ");

        if (!code || code.trim() === "") {
            console.error("\n❌ No code entered");
            rl.close();
            return;
        }

        console.log("\nVerifying code...\n");

        const result = await khqrBakongService.verifyToken({
            code: code.trim()
        });

        console.log("Response Code:", result.responseCode);
        console.log("Response Message:", result.responseMessage);

        if (result.responseCode === 0 && result.data?.token) {
            console.log("\n✅ SUCCESS! Token received\n");
            console.log("=".repeat(80));
            console.log("ACCESS TOKEN:");
            console.log("=".repeat(80));
            console.log(result.data.token);
            console.log("=".repeat(80));

            console.log("\n📝 Update your .env file:");
            console.log("\n1. Open services/payment-service/.env");
            console.log("2. Replace the BAKONG_ACCESS_TOKEN value with the token above");
            console.log("3. Save the file");
            console.log("4. Restart your payment service\n");

            console.log("Copy this line to your .env file:");
            console.log(`BAKONG_ACCESS_TOKEN=${result.data.token}`);
            console.log("\n⚠️  Note: This token expires in 90 days");
        } else {
            console.error("\n❌ Verification failed");
            console.log("- Check if the code is correct");
            console.log("- The code may have expired (usually valid for 10-15 minutes)");
            console.log("- Try requesting a new code with renew-bakong-token.ts");
        }
    } catch (error: any) {
        console.error("\n❌ Error:", error.message);
    } finally {
        rl.close();
    }

    console.log("\n========================================\n");
}

verifyToken();
