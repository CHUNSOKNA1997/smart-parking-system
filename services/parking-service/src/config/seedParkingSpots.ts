import prisma from "./prisma.js";
import { SpotType } from "@prisma/client";

// Generate parking spots with SPOT-001, SPOT-002 format
const generateParkingSpots = () => {
    const spots = [];
    
    // Generate 50 car spots: SPOT-001 to SPOT-050
    for (let i = 1; i <= 50; i++) {
        const spotNumber = String(i).padStart(3, '0');
        spots.push({
            spotName: `SPOT-${spotNumber}`,
            spotType: SpotType.CAR,
            isAvailable: true,
            pricePerHour: 2.5,
        });
    }
    
    // Generate 20 motorcycle spots: SPOT-051 to SPOT-070
    for (let i = 51; i <= 70; i++) {
        const spotNumber = String(i).padStart(3, '0');
        spots.push({
            spotName: `SPOT-${spotNumber}`,
            spotType: SpotType.MOTORCYCLE,
            isAvailable: true,
            pricePerHour: 1.0,
        });
    }
    
    return spots;
};

export const seedParkingSpots = async () => {
    try {
        console.log("starting parking spots seeder...");

        // Check if spots already exist
        const existingCount = await prisma.parkingSpot.count();
        if (existingCount > 0) {
            console.log(
                `database already has ${existingCount} parking spots, skipping seed`
            );
            return;
        }

        // Generate and create parking spots
        const parkingSpots = generateParkingSpots();
        const result = await prisma.parkingSpot.createMany({
            data: parkingSpots,
            skipDuplicates: true,
        });

        console.log(`success: seeded ${result.count} parking spots`);

        // Display summary
        const spotsByType = await prisma.parkingSpot.groupBy({
            by: ["spotType"],
            _count: true,
        });

        console.log("\nstats: parking spots summary:");
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
        console.error("error: Error seeding parking spots:", error);
        throw error;
    }
};
