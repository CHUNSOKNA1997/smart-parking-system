import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import parkingRoutes from "./routes/parking.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { setupSwagger } from "./config/swagger.js";

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
	origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
	credentials: true,
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req: Request, res: Response, next: NextFunction) => {
	console.log(`${req.method} ${req.path}`);
	next();
});

// API v1 routes
app.use("/api/v1/parking", parkingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/transactions", transactionRoutes);
// User routes removed - handled by auth-service

setupSwagger(app);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
