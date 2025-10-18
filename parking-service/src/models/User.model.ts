import prisma from '../config/prisma.js';

class UserModel {
  // Find user by ID (basic info for parking service)
  static async findById(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isVerified: true
      }
    });
  }

  // Update user profile (for parking service)
  static async updateProfile(userId, updates) {
    const { firstName, lastName, phone } = updates;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        updatedAt: true
      }
    });
  }
}

export default UserModel;
