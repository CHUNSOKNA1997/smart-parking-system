import prisma from '../config/prisma.js';

class ParkingSpotModel {
  // Get all parking spots
  static async findAll() {
    return await prisma.parkingSpot.findMany({
      orderBy: [
        { level: 'asc' },
        { section: 'asc' },
        { id: 'asc' }
      ]
    });
  }

  // Get all available spots
  static async findAvailable() {
    return await prisma.parkingSpot.findMany({
      where: { isAvailable: true },
      orderBy: [
        { level: 'asc' },
        { section: 'asc' }
      ]
    });
  }

  // Find spot by ID
  static async findById(spotId) {
    return await prisma.parkingSpot.findUnique({
      where: { id: spotId }
    });
  }

  // Find spots by type
  static async findByType(spotType) {
    return await prisma.parkingSpot.findMany({
      where: { 
        spotType,
        isAvailable: true
      }
    });
  }

  // Update spot availability
  static async updateAvailability(spotId, isAvailable) {
    return await prisma.parkingSpot.update({
      where: { id: spotId },
      data: { 
        isAvailable,
        lastUpdated: new Date()
      }
    });
  }

  // Get spots by level
  static async findByLevel(level) {
    return await prisma.parkingSpot.findMany({
      where: { level },
      orderBy: { id: 'asc' }
    });
  }

  // Get spots statistics
  static async getStatistics() {
    const total = await prisma.parkingSpot.count();
    const available = await prisma.parkingSpot.count({
      where: { isAvailable: true }
    });
    const occupied = total - available;

    const byType = await prisma.parkingSpot.groupBy({
      by: ['spotType'],
      _count: { spotType: true },
      where: { isAvailable: true }
    });

    return {
      total,
      available,
      occupied,
      availableByType: byType.map(item => ({
        type: item.spotType,
        count: item._count.spotType
      }))
    };
  }
}

export default ParkingSpotModel;
