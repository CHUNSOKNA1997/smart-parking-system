import prisma from "./prisma.js";
import { SpotType } from "@prisma/client";

const parkingSpots = [
    {
        id: "A1-001",
        level: 1,
        section: "A1",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 2.5,
    },
    {
        id: "A1-002",
        level: 1,
        section: "A1",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 2.5,
    },
    {
        id: "A1-003",
        level: 1,
        section: "A1",
        spotType: SpotType.MOTORCYCLE,
        isAvailable: true,
        pricePerHour: 1.0,
    },
    {
        id: "A1-004",
        level: 1,
        section: "A1",
        spotType: SpotType.MOTORCYCLE,
        isAvailable: true,
        pricePerHour: 1.0,
    },
    {
        id: "B1-001",
        level: 1,
        section: "B1",
        spotType: SpotType.CAR,
        isAvailable: false,
        pricePerHour: 2.5,
    },
    {
        id: "B1-002",
        level: 1,
        section: "B1",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 2.5,
    },
    {
        id: "A2-001",
        level: 2,
        section: "A2",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 3.0,
    },
    {
        id: "A2-002",
        level: 2,
        section: "A2",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 3.0,
    },
    {
        id: "A2-003",
        level: 2,
        section: "A2",
        spotType: SpotType.MOTORCYCLE,
        isAvailable: false,
        pricePerHour: 1.5,
    },
    {
        id: "B2-001",
        level: 2,
        section: "B2",
        spotType: SpotType.CAR,
        isAvailable: true,
        pricePerHour: 3.0,
    },
];

export const seedParkingSpots = async () => {
    try {
        console.log("🌱 Starting parking spots seeder...");

        // Check if spots already exist
        const existingCount = await prisma.parkingSpot.count();
        if (existingCount > 0) {
            console.log(
                `ℹ️  Database already has ${existingCount} parking spots. Skipping seed.`
            );
            return;
        }

        // Create parking spots
        const result = await prisma.parkingSpot.createMany({
            data: parkingSpots,
            skipDuplicates: true,
        });

        console.log(`SUCCESS: Successfully seeded ${result.count} parking spots`);

        // Display summary
        const spotsByType = await prisma.parkingSpot.groupBy({
            by: ["spotType"],
            _count: true,
        });

        console.log("\nSTATS: Parking Spots Summary:");
        spotsByType.forEach((type) => {
            console.log(`   - ${type.spotType}: ${type._count} spots`);
        });

        const availableCount = await prisma.parkingSpot.count({
            where: { isAvailable: true },
        });
        console.log(`   - Available: ${availableCount} spots`);
        console.log(
            `   - Occupied: ${existingCount + result.count - availableCount} spots\n`
        );
    } catch (error) {
        console.error("ERROR: Error seeding parking spots:", error);
        throw error;
    }
};
