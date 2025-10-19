import "dotenv/config";
import { Server } from "http";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { initDefaultUser } from "./config/initDefaultUser.js";

const PORT: number = parseInt(process.env.PORT || "3001", 10);

// Test database connection
prisma.$queryRaw`SELECT NOW()`
  .then((result) => {
    console.log("✅ Database connected successfully");
    console.log(`📅 Database time: ${result[0].now}`);
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

await initDefaultUser();

// Start server
const server: Server = app.listen(PORT, () => {
	console.log(`🚀 Auth Service running on port ${PORT}`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
	console.log(`💚 Health check: http://localhost:${PORT}/health`);
	console.log(`📡 API: http://localhost:${PORT}/api/v1/auth`);
});

// Graceful shutdown
const shutdown = async (signal) => {
	console.log(`⚠️  ${signal} signal received: closing HTTP server`);
	server.close(async () => {
		console.log("✅ HTTP server closed");
		await prisma.$disconnect();
		console.log("✅ Database disconnected");
		process.exit(0);
	});
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
