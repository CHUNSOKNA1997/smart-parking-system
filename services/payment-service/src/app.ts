import express, {
    type Application,
    type Request,
    type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes.js";
import { payWayRoutes, webhookRoutes } from "./routes/payway.routes.js";
import userRoutes from "./routes/user.routes.js";
import blockchainRoutes from "./routes/blockchain.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { setupSwagger } from "./config/swagger.js";
import { blockchainService } from "./blockchain/blockchain.service.js";

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

// Swagger Documentation
setupSwagger(app);

// IMPORTANT: Mount webhook route FIRST (before protected routes)
// This ensures the webhook is public and not caught by auth middleware
app.use("/api/v1/payments", webhookRoutes); // Public routes (webhook)

// API Routes (v1) - Protected
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/users", userRoutes);

// PayWay Routes - Protected
app.use("/api/v1/payments/payway", payWayRoutes); // Protected routes (QR generation, status check)

// Blockchain Routes
app.use("/api/v1/payments", blockchainRoutes);

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

// Initialize blockchain service (async)
blockchainService.initialize().then((ready) => {
    if (ready) {
        console.log("[App] Blockchain service initialized successfully");
    } else {
        console.log("[App] Blockchain service disabled or not configured");
    }
});

export default app;
