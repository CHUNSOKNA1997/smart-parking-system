/**
 * Blockchain Service
 * Handles interaction with the PaymentRecord smart contract
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ABI will be generated after compiling the contract
let PaymentRecordABI: any[] = [];

// Try to load ABI from compiled artifacts
const abiPath = path.join(__dirname, "PaymentRecord.abi.json");
if (fs.existsSync(abiPath)) {
    PaymentRecordABI = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
}

interface BlockchainConfig {
    enabled: boolean;
    rpcUrl: string;
    privateKey: string;
    contractAddress: string;
}

interface RecordPaymentResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
}

interface PaymentOnChain {
    paymentId: string;
    orderId: string;
    amount: string;
    currency: string;
    timestamp: number;
    exists: boolean;
}

class BlockchainService {
    private provider: JsonRpcProvider | null = null;
    private wallet: Wallet | null = null;
    private contract: Contract | null = null;
    private config: BlockchainConfig;
    private initialized: boolean = false;

    constructor() {
        this.config = {
            enabled: process.env.BLOCKCHAIN_ENABLED === "true",
            rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
            privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || "",
            contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "",
        };
    }

    /**
     * Initialize the blockchain connection
     */
    async initialize(): Promise<boolean> {
        if (!this.config.enabled) {
            console.log(
                "[Blockchain] Service disabled via BLOCKCHAIN_ENABLED=false"
            );
            return false;
        }

        if (!this.config.privateKey || !this.config.contractAddress) {
            console.warn(
                "[Blockchain] Missing BLOCKCHAIN_PRIVATE_KEY or BLOCKCHAIN_CONTRACT_ADDRESS"
            );
            return false;
        }

        try {
            // Connect to the blockchain
            this.provider = new JsonRpcProvider(this.config.rpcUrl);

            // Create wallet from private key
            this.wallet = new Wallet(this.config.privateKey, this.provider);

            // Connect to the smart contract
            this.contract = new Contract(
                this.config.contractAddress,
                PaymentRecordABI,
                this.wallet
            );

            // Test connection
            const network = await this.provider.getNetwork();
            console.log(
                `[Blockchain] Connected to network: ${network.name} (chainId: ${network.chainId})`
            );
            console.log(
                `[Blockchain] Contract address: ${this.config.contractAddress}`
            );
            console.log(`[Blockchain] Wallet address: ${this.wallet.address}`);

            this.initialized = true;
            return true;
        } catch (error) {
            console.error("[Blockchain] Failed to initialize:", error);
            return false;
        }
    }

    /**
     * Check if the service is ready
     */
    isReady(): boolean {
        return this.initialized && this.contract !== null;
    }

    /**
     * Record a payment on the blockchain
     */
    async recordPayment(
        paymentId: string,
        orderId: string,
        amount: number,
        currency: string
    ): Promise<RecordPaymentResult> {
        if (!this.isReady()) {
            return {
                success: false,
                error: "Blockchain service not initialized",
            };
        }

        try {
            console.log(`[Blockchain] Recording payment: ${paymentId}`);

            // Convert amount to cents (integer)
            const amountInCents = Math.round(amount * 100);

            // Call the smart contract
            const tx = await this.contract!.recordPayment(
                paymentId,
                orderId,
                amountInCents,
                currency
            );

            console.log(`[Blockchain] Transaction sent: ${tx.hash}`);

            // Wait for transaction to be mined
            const receipt = await tx.wait();

            console.log(
                `[Blockchain] Payment recorded in block: ${receipt.blockNumber}`
            );

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
            };
        } catch (error: any) {
            console.error(
                "[Blockchain] Failed to record payment:",
                error.message
            );
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Verify if a payment exists on the blockchain
     */
    async verifyPayment(paymentId: string): Promise<boolean> {
        if (!this.isReady()) {
            return false;
        }

        try {
            const exists = await this.contract!.verifyPayment(paymentId);
            return exists;
        } catch (error) {
            console.error("[Blockchain] Failed to verify payment:", error);
            return false;
        }
    }

    /**
     * Get payment details from blockchain
     */
    async getPayment(paymentId: string): Promise<PaymentOnChain | null> {
        if (!this.isReady()) {
            return null;
        }

        try {
            const result = await this.contract!.getPayment(paymentId);

            if (!result.exists) {
                return null;
            }

            return {
                paymentId: result.paymentId,
                orderId: result.orderId,
                amount: (Number(result.amount) / 100).toFixed(2),
                currency: result.currency,
                timestamp: Number(result.timestamp),
                exists: result.exists,
            };
        } catch (error) {
            console.error("[Blockchain] Failed to get payment:", error);
            return null;
        }
    }

    /**
     * Get the total number of payments recorded
     */
    async getPaymentCount(): Promise<number> {
        if (!this.isReady()) {
            return 0;
        }

        try {
            const count = await this.contract!.getPaymentCount();
            return Number(count);
        } catch (error) {
            console.error("[Blockchain] Failed to get payment count:", error);
            return 0;
        }
    }

    /**
     * Get blockchain status information
     */
    async getStatus(): Promise<object> {
        if (!this.config.enabled) {
            return { enabled: false };
        }

        if (!this.isReady()) {
            return {
                enabled: true,
                initialized: false,
                error: "Service not initialized",
            };
        }

        try {
            const network = await this.provider!.getNetwork();
            const balance = await this.provider!.getBalance(
                this.wallet!.address
            );
            const paymentCount = await this.getPaymentCount();

            return {
                enabled: true,
                initialized: true,
                network: network.name,
                chainId: Number(network.chainId),
                contractAddress: this.config.contractAddress,
                walletAddress: this.wallet!.address,
                walletBalance: ethers.formatEther(balance) + " ETH",
                totalPaymentsRecorded: paymentCount,
            };
        } catch (error: any) {
            return {
                enabled: true,
                initialized: true,
                error: error.message,
            };
        }
    }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default BlockchainService;
