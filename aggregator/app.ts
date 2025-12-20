// aggregator/app.ts - API Gateway for Smart Parking System
import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import axios from "axios";
import _ from "lodash";
import cors from "cors";

const app = express();
const PORT = 3000;

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const PARKING_SERVICE_URL = process.env.PARKING_SERVICE_URL || "http://localhost:3002";
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3003";

// Improved Swagger Types
interface SwaggerInfo {
  title: string;
  version: string;
  description?: string;
}

interface SwaggerServer {
  url: string;
  description?: string;
}

interface SwaggerSpec {
  openapi: string;
  info: SwaggerInfo;
  servers?: SwaggerServer[];
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    [key: string]: any;
  };
  tags?: any[];
  [key: string]: any;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy helper function
const proxyRequest = async (
  req: Request,
  res: Response,
  targetUrl: string
) => {
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ..._.omit(req.headers, ["content-length", "host"]),
        host: new URL(targetUrl).host,
      },
      params: req.query,
      timeout: 30000, // 30 seconds timeout
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        success: false,
        message: "Service unavailable",
        error: error.message,
      });
    }
  }
};

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// Route authentication requests to auth-service
app.use("/api/v1/auth", async (req: Request, res: Response) => {
  const targetUrl = `${AUTH_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Route user requests to auth-service
app.all("/api/v1/users*", async (req: Request, res: Response) => {
  const targetUrl = `${AUTH_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Route parking requests to parking-service
app.all("/api/v1/parking*", async (req: Request, res: Response) => {
  const targetUrl = `${PARKING_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Route booking requests to parking-service
app.all("/api/v1/bookings*", async (req: Request, res: Response) => {
  const targetUrl = `${PARKING_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Route transaction requests to parking-service
app.all("/api/v1/transactions*", async (req: Request, res: Response) => {
  const targetUrl = `${PARKING_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Route payment requests to payment-service
app.all("/api/v1/payments*", async (req: Request, res: Response) => {
  const targetUrl = `${PAYMENT_SERVICE_URL}${req.path}`;
  await proxyRequest(req, res, targetUrl);
});

// Endpoint to merge Swagger JSON from microservices
app.get("/swagger.json", async (req: Request, res: Response) => {
  try {
    const [service1, service2, service3] = await Promise.all([
      axios.get<SwaggerSpec>(`${AUTH_SERVICE_URL}/swagger.json`),
      axios.get<SwaggerSpec>(`${PARKING_SERVICE_URL}/swagger.json`),
      axios.get<SwaggerSpec>(`${PAYMENT_SERVICE_URL}/swagger.json`),
    ]);

    const mergedSwagger: SwaggerSpec = {
      openapi: "3.0.0",
      info: {
        title: "Smart Parking System API",
        version: "1.0.0",
      },
      paths: {
        ...service1.data.paths,
        ...service2.data.paths,
        ...service3.data.paths,
      },
      components: _.merge(
        {},
        service1.data.components,
        service2.data.components,
        service3.data.components
      ),
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: "API Gateway",
        },
      ],
    };

    res.json(mergedSwagger);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching Swagger JSON");
  }
});

// Serve Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swaggerDocument = await axios
        .get<SwaggerSpec>(`http://localhost:${PORT}/swagger.json`)
        .then((r: any) => r.data);

      swaggerUi.setup(swaggerDocument)(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`🔗 Parking Service: ${PARKING_SERVICE_URL}`);
  console.log(`🔗 Payment Service: ${PAYMENT_SERVICE_URL}`);
});
