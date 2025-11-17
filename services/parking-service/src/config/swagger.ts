import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Parking Service API",
            version: "1.0.0",
            description:
                "Parking microservice for managing parking spots, bookings, and transactions",
        },
        servers: [
            {
                url: "http://localhost:3002",
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
                apiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key",
                },
            },
            schemas: {
                ParkingSpot: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        spotNumber: {
                            type: "string",
                        },
                        level: {
                            type: "string",
                        },
                        section: {
                            type: "string",
                        },
                        spotType: {
                            type: "string",
                            enum: ["CAR", "MOTORCYCLE"],
                        },
                        isAvailable: {
                            type: "boolean",
                        },
                    },
                },
                Booking: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                        },
                        userId: {
                            type: "string",
                            format: "uuid",
                        },
                        spotId: {
                            type: "string",
                            format: "uuid",
                        },
                        status: {
                            type: "string",
                            enum: ["RESERVED", "ACTIVE", "COMPLETED", "CANCELLED"],
                        },
                        startTime: {
                            type: "string",
                            format: "date-time",
                        },
                        endTime: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                        },
                    },
                },
                Transaction: {
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
                        paymentMethod: {
                            type: "string",
                            enum: ["CASH", "KHQR", "CARD"],
                        },
                        status: {
                            type: "string",
                            enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
                        },
                        transactionDate: {
                            type: "string",
                            format: "date-time",
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
