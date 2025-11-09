import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || "khqr-service";

const server = app.listen(PORT, () => {
	console.log(
		"╔════════════════════════════════════════════════════════════╗"
	);
	console.log(`║  ${SERVICE_NAME.toUpperCase()} - KHQR Payment Service`);
	console.log(
		"╠════════════════════════════════════════════════════════════╣"
	);
	console.log(`║  Port:        ${PORT}`);
	console.log(`║  Environment: ${process.env.NODE_ENV || "development"}`);
	console.log(`║  Database:    PostgreSQL (auth_db)`);
	const bakongUrl = process.env.NODE_ENV === 'production' 
		? process.env.BAKONG_PROD_BASE_API_URL 
		: process.env.BAKONG_DEV_BASE_API_URL;
	console.log(`║  Bakong API:  ${bakongUrl}`);
	console.log(
		"╠════════════════════════════════════════════════════════════╣"
	);
	console.log(`║  Health:      http://localhost:${PORT}/health`);
	console.log(`║  API:         http://localhost:${PORT}/api/payments`);
	console.log(
		"╚════════════════════════════════════════════════════════════╝"
	);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("SIGTERM signal received: closing HTTP server");
	server.close(() => {
		console.log("HTTP server closed");
		process.exit(0);
	});
});

process.on("SIGINT", () => {
	console.log("\nSIGINT signal received: closing HTTP server");
	server.close(() => {
		console.log("HTTP server closed");
		process.exit(0);
	});
});
