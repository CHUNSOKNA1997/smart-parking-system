import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
        // Uncomment for Polygon Mumbai testnet deployment
        // mumbai: {
        //     url: process.env.POLYGON_MUMBAI_RPC_URL || "",
        //     accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        //     chainId: 80001,
        // },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};

export default config;
