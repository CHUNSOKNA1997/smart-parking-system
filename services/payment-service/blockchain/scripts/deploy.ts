import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Deploying PaymentRecord contract...\n");

    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📍 Deploying with account:", deployer.address);
    console.log(
        "💰 Account balance:",
        ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
        "ETH\n"
    );

    // Deploy the contract
    const PaymentRecord = await ethers.getContractFactory("PaymentRecord");
    const paymentRecord = await PaymentRecord.deploy();

    await paymentRecord.waitForDeployment();

    const contractAddress = await paymentRecord.getAddress();
    console.log("✅ PaymentRecord deployed to:", contractAddress);
    console.log(
        "📝 Transaction hash:",
        paymentRecord.deploymentTransaction()?.hash
    );

    // Save deployment info for the payment-service to use
    const deploymentInfo = {
        contractAddress: contractAddress,
        deployer: deployer.address,
        network: process.env.HARDHAT_NETWORK || "localhost",
        deployedAt: new Date().toISOString(),
        transactionHash: paymentRecord.deploymentTransaction()?.hash,
    };

    // Save to a JSON file that the payment-service can read
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📄 Deployment info saved to:", deploymentPath);

    // Also save the ABI for the payment-service
    const artifactPath = path.join(
        __dirname,
        "..",
        "artifacts",
        "contracts",
        "PaymentRecord.sol",
        "PaymentRecord.json"
    );
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        const abiPath = path.join(
            __dirname,
            "..",
            "..",
            "src",
            "blockchain",
            "PaymentRecord.abi.json"
        );

        // Ensure directory exists
        const abiDir = path.dirname(abiPath);
        if (!fs.existsSync(abiDir)) {
            fs.mkdirSync(abiDir, { recursive: true });
        }

        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log("📄 ABI saved to:", abiPath);
    }

    console.log("\n🎉 Deployment complete!");
    console.log("\n📋 Next steps:");
    console.log("   1. Copy the contract address to your .env file:");
    console.log(`      BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
    console.log(
        "   2. Start the payment-service to begin recording payments on-chain"
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
