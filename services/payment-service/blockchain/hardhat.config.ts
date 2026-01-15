import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables from parent .env file
dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        // Polygon Amoy Testnet (free test tokens)
        amoy: {
            url:
                process.env.POLYGON_AMOY_RPC_URL ||
                "https://rpc-amoy.polygon.technology",
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY
                ? [process.env.BLOCKCHAIN_PRIVATE_KEY]
                : [],
            chainId: 80002,
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    // For verifying contracts on PolygonScan
    etherscan: {
        apiKey: {
            polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
        },
    },
};

export default config;
