import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Parking Service API",
            version: "1.0.0",
            description: "Parking microservice endpoints",
        },
        servers: [
            {
                url: "http://localhost:3002", // Auth service URL
            },
        ],
    },
    apis: ["./routes/*.ts", "./controllers/*.ts"], // Files containing JSDoc comments
};

const swaggerSpec = swaggerJsDoc(options);

export const setupSwagger = (app: Express) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get("/swagger.json", (req, res) => res.json(swaggerSpec));
};
