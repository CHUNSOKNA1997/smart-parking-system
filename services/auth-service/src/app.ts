import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { setupSwagger } from "./config/swagger.js";
import path from "path";

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
};
app.use(cors(corsOptions));

// Body parser middleware - Don't parse multipart/form-data (handled by multer)
app.use((req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
        // Skip body parsing for multipart - let multer handle it
        return next();
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Serve static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API v1 routes
app.use("/api/v1/auth", authRoutes);

setupSwagger(app);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
