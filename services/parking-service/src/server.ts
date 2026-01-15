import "dotenv/config.js";
import { Server } from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { seedParkingSpots } from "./config/seedParkingSpots.js";
import CronService from "./services/cron.service.js";

const PORT: number = parseInt(process.env.PORT || "3002", 10);
const SERVICE_NAME: string = "parking-service";

// Seed parking spots on startup
await seedParkingSpots();

// Start background cron jobs
CronService.start();

// Start server
const server: Server = app.listen(PORT, () => {
    console.log(`\n[${SERVICE_NAME}] parking service running on port ${PORT}`);
    console.log(
        `[${SERVICE_NAME}] environment: ${
            process.env.NODE_ENV || "development"
        }`
    );
    console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/health`);
    console.log(
        `[${SERVICE_NAME}] api: http://localhost:${PORT}/api/v1/parking\n`
    );
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
