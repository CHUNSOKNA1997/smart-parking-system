import prisma from "../config/prisma.js";

/**
 * Model for managing parking spot data and operations.
 * Provides methods for querying, updating, and retrieving parking spot statistics.
 */
class ParkingSpotModel {
    /**
     * Retrieves all parking spots from the database.
     * Results are ordered by spot name.
     *
     * @returns Array of all parking spots
     */
    static async findAll() {
        return await prisma.parkingSpot.findMany({
            orderBy: [{ spotName: "asc" }],
        });
    }

    /**
     * Retrieves all currently available parking spots.
     * Only returns spots where isAvailable is true.
     *
     * @returns Array of available parking spots
     */
    static async findAvailable() {
        return await prisma.parkingSpot.findMany({
            where: { isAvailable: true },
            orderBy: [{ spotName: "asc" }],
        });
    }

    /**
     * Retrieves a parking spot by its unique identifier.
     *
     * @param spotId - Unique parking spot ID
     * @returns Parking spot object or null if not found
     */
    static async findById(spotId) {
        return await prisma.parkingSpot.findUnique({
            where: { id: spotId },
        });
    }

    /**
     * Retrieves available parking spots filtered by type.
     * Only returns spots that are both of the specified type and available.
     *
     * @param spotType - Type of parking spot (e.g., 'regular', 'disabled', 'vip')
     * @returns Array of available spots matching the specified type
     */
    static async findByType(spotType) {
        return await prisma.parkingSpot.findMany({
            where: {
                spotType,
                isAvailable: true,
            },
        });
    }

    /**
     * Updates the availability status of a parking spot.
     * Also updates the lastUpdated timestamp.
     *
     * @param spotId - Unique parking spot ID
     * @param isAvailable - Boolean indicating spot availability
     * @returns Updated parking spot object
     */
    static async updateAvailability(spotId, isAvailable) {
        return await prisma.parkingSpot.update({
            where: { id: spotId },
            data: {
                isAvailable,
                lastUpdated: new Date(),
            },
        });
    }

    /**
     * Retrieves a parking spot by its spot name (e.g., SPOT-001).
     *
     * @param spotName - Parking spot name
     * @returns Parking spot object or null if not found
     */
    static async findBySpotName(spotName) {
        return await prisma.parkingSpot.findUnique({
            where: { spotName },
        });
    }

    /**
     * Retrieves comprehensive statistics about parking spot usage.
     * Includes total spots, available spots, occupied spots, and availability breakdown by type.
     *
     * @returns Object containing parking statistics
     */
    static async getStatistics() {
        const total = await prisma.parkingSpot.count();
        const available = await prisma.parkingSpot.count({
            where: { isAvailable: true },
        });
        const occupied = total - available;

        const byType = await prisma.parkingSpot.groupBy({
            by: ["spotType"],
            _count: { spotType: true },
            where: { isAvailable: true },
        });

        return {
            total,
            available,
            occupied,
            availableByType: byType.map((item) => ({
                type: item.spotType,
                count: item._count.spotType,
            })),
        };
    }
}

/**
 * Export singleton instance of ParkingSpotModel.
 * Use this for all parking spot database operations.
 */
export default ParkingSpotModel;
