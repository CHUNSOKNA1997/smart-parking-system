// aggregator/app.ts
import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import axios from "axios";
import _ from "lodash";

const app = express();
const PORT = 3000;

interface SwaggerSpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, any>;
  components?: Record<string, any>;
}

// Endpoint to merge Swagger JSON from microservices
app.get("/swagger.json", async (req: Request, res: Response) => {
  try {
    const [service1, service2] = await Promise.all([
      axios.get<SwaggerSpec>("http://localhost:3001/swagger.json"),
      axios.get<SwaggerSpec>("http://localhost:3002/swagger.json"),
    ]);

    const mergedSwagger: SwaggerSpec = {
      openapi: "3.0.0",
      info: { title: "Centralized API", version: "1.0.0" },
      paths: { ...service1.data.paths, ...service2.data.paths },
      components: _.merge(
        {},
        service1.data.components,
        service2.data.components
      ),
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
  console.log(`Central Swagger running on http://localhost:${PORT}/api-docs`);
});
