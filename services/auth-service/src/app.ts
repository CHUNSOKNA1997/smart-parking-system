import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
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
app.use("/api/v1/auth", authRoutes);

setupSwagger(app);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
