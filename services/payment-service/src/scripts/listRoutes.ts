import listEndpoints from "express-list-endpoints";
import app from "../app.js";

// Get all routes
const routes = listEndpoints(app);

console.log("\n===========================================");
console.log("Payment Service - Routes List");
console.log("===========================================\n");

// Display routes in a table-like format
routes.forEach((route, index) => {
    const methods = route.methods.join(", ");
    console.log(`${index + 1}. [${methods}] ${route.path}`);
    if (route.middlewares && route.middlewares.length > 0) {
        console.log(`   Middlewares: ${route.middlewares.join(", ")}`);
    }
});

console.log("\n===========================================");
console.log(`Total Routes: ${routes.length}`);
console.log("===========================================\n");
