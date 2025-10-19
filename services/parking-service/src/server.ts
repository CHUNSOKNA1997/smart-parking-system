import "dotenv/config";
import { Server } from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { seedParkingSpots } from "./config/seedParkingSpots.js";

const PORT: number = parseInt(process.env.PORT || "3002", 10);

// Seed parking spots on startup
await seedParkingSpots();

// Start server
const server: Server = app.listen(PORT, () => {
	console.log(`🚀 Parking Service running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
	console.log(`${signal} signal received: closing HTTP server`);
	server.close(async () => {
		console.log("HTTP server closed");
		await prisma.$disconnect();
		console.log("Database disconnected");
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
