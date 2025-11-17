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
import { setupSwagger } from "./config/swagger.js";

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

// API Routes (v1)
app.use("/api/v1/payments", paymentRoutes);

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
