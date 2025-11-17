import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Payment Service API",
            version: "1.0.0",
            description:
                "Payment microservice with KHQR (Bakong QR) integration for Smart Parking System",
        },
        servers: [
            {
                url: "http://localhost:3003",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Payment: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        bookingId: {
                            type: "string",
                            format: "uuid",
                        },
                        userId: {
                            type: "string",
                            format: "uuid",
                        },
                        amount: {
                            type: "number",
                            format: "decimal",
                        },
                        currency: {
                            type: "string",
                            enum: ["USD", "KHR"],
                        },
                        status: {
                            type: "string",
                            enum: [
                                "PENDING",
                                "PAID",
                                "FAILED",
                                "CANCELLED",
                                "REFUNDED",
                                "EXPIRED",
                            ],
                        },
                        qrCode: {
                            type: "string",
                        },
                        md5Hash: {
                            type: "string",
                        },
                        deeplink: {
                            type: "string",
                            nullable: true,
                        },
                        expiresAt: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                        },
                    },
                },
                ApiResponse: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                        },
                        message: {
                            type: "string",
                        },
                        data: {
                            type: "object",
                        },
                    },
                },
                Error: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            example: false,
                        },
                        message: {
                            type: "string",
                        },
                        error: {
                            type: "string",
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const swaggerSpec = swaggerJsDoc(options);

export const setupSwagger = (app: Application) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get("/swagger.json", (req, res) => res.json(swaggerSpec));
};
