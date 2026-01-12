import "dotenv/config";
import { Server } from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { startPaymentExpiryJob } from "./utils/payment-expiry.job.js";

const PORT: number = parseInt(process.env.PORT || "3003", 10);
const SERVICE_NAME: string = process.env.SERVICE_NAME || "payment-service";

// Start server
const server: Server = app.listen(PORT, () => {
    console.log(`\n[${SERVICE_NAME}] payment service running on port ${PORT}`);
    console.log(
        `[${SERVICE_NAME}] Environment: ${
            process.env.NODE_ENV || "development"
        }`
    );
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/health`);
    console.log(
        `[${SERVICE_NAME}] api: http://localhost:${PORT}/api/v1/payments\n`
    );

    startPaymentExpiryJob();
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n[${SERVICE_NAME}] ${signal} received: closing server`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log(`[${SERVICE_NAME}] server closed\n`);
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
