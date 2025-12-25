// Prisma Client Instance
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Handle connection
prisma
    .$connect()
    .then(() => console.log("✅ Prisma connected to database"))
    .catch((err) => {
        console.error("❌ Prisma connection failed:", err);
        process.exit(1);
    });

// Graceful shutdown
process.on("beforeExit", async () => {
    await prisma.$disconnect();
});

export default prisma;
