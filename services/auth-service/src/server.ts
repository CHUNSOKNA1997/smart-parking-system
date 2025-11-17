import "dotenv/config";
import { Server } from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { initDefaultUser } from "./config/initDefaultUser.js";

const PORT: number = parseInt(process.env.PORT || "3001", 10);
const SERVICE_NAME: string = "auth-service";

await initDefaultUser();

// Start server
const server: Server = app.listen(PORT, () => {
    console.log(`\n[${SERVICE_NAME}] Auth Service running on port ${PORT}`);
    console.log(
        `[${SERVICE_NAME}] Environment: ${process.env.NODE_ENV || "development"}`
    );
    console.log(`[${SERVICE_NAME}] Health: http://localhost:${PORT}/health`);
    console.log(
        `[${SERVICE_NAME}] API: http://localhost:${PORT}/api/v1/auth\n`
    );
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n[${SERVICE_NAME}] ${signal} received: closing server`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log(`[${SERVICE_NAME}] Server closed\n`);
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
