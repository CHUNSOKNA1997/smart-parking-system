import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import prisma from "./config/prisma.js";

dotenv.config();

const app: Application = express();

// Middleware
app.use(helmet());
app.use(
	cors({
		origin: process.env.CORS_ORIGIN?.split(",") || "*",
		credentials: true,
	})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", async (req: Request, res: Response) => {
	try {
		// Check database connection
		await prisma.$queryRaw`SELECT 1`;

		res.json({
			success: true,
			message: "KHQR Service is running",
			service: process.env.SERVICE_NAME || "khqr-service",
			timestamp: new Date().toISOString(),
			database: "connected",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Service is unhealthy",
			error: "Database connection failed",
		});
	}
});

// API Routes
app.use("/api/payments", paymentRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
	res.status(404).json({
		success: false,
		message: "Route not found",
		path: req.path,
	});
});

// Error Handler
app.use(errorMiddleware);

export default app;
