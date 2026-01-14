# Blockchain Integration - Setup Guide

This guide explains how to set up and use the blockchain integration for payment recording.

## Quick Start

### 1. Install Dependencies

```bash
# Install blockchain dependencies
cd services/payment-service/blockchain
npm install

# Install payment-service dependencies (includes ethers.js)
cd ../
npm install
```

### 2. Run Prisma Migration

```bash
cd services/payment-service
npx prisma migrate dev --name add_blockchain_fields
npx prisma generate
```

### 3. Start Local Blockchain

```bash
# Terminal 1: Start Hardhat node
cd services/payment-service/blockchain
npx hardhat node
```

### 4. Deploy Smart Contract

```bash
# Terminal 2: Deploy contract
cd services/payment-service/blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

### 5. Configure Environment

Copy the deployed contract address and update `.env`:

```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_CONTRACT_ADDRESS=0x5FbDB2315678... # Your deployed address
```

### 6. Start Payment Service

```bash
# Terminal 3: Start service
cd services/payment-service
npm run dev
```

## Testing

```bash
# Test smart contract
cd services/payment-service/blockchain
npx hardhat test

# Check blockchain status via API
curl http://localhost:3003/api/v1/payments/blockchain/status
```

## Files Created

| File                                     | Purpose              |
| ---------------------------------------- | -------------------- |
| `blockchain/contracts/PaymentRecord.sol` | Smart contract       |
| `blockchain/scripts/deploy.ts`           | Deployment script    |
| `blockchain/test/PaymentRecord.test.ts`  | Contract tests       |
| `src/blockchain/blockchain.service.ts`   | Contract interaction |
| `src/routes/blockchain.routes.ts`        | Verification APIs    |
