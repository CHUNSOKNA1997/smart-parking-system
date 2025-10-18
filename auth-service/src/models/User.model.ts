import prisma from '../config/prisma.js';
import { User } from '@prisma/client';
import { UserCreateData, UserUpdateData } from '../types/index.js';

class UserModel {
  // Create new user
  static async create(userData: UserCreateData): Promise<Omit<User, 'passwordHash' | 'verificationToken' | 'resetToken' | 'resetTokenExpiry' | 'updatedAt'>> {
    const { firstName, lastName, email, passwordHash, verificationToken, phone } = userData;
    
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        verificationToken,
        phone: phone || null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isVerified: true,
        createdAt: true
      }
    });

    return user;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  // Find user by ID
  static async findById(userId: string): Promise<Omit<User, 'passwordHash' | 'verificationToken' | 'resetToken' | 'resetTokenExpiry'> | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // Find user by verification token
  static async findByVerificationToken(token: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { verificationToken: token }
    });
  }

  // Find user by reset token
  static async findByResetToken(token: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Greater than now (not expired)
        }
      }
    });
  }

  // Update verification status
  static async verifyEmail(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationToken: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true
      }
    });
  }

  // Update verification token
  static async updateVerificationToken(userId: string, token: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { verificationToken: token },
      select: {
        id: true,
        email: true
      }
    });
  }

  // Set reset token
  static async setResetToken(userId: string, token: string, expiry: Date) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      },
      select: {
        id: true,
        email: true
      }
    });
  }

  // Update password
  static async updatePassword(userId: string, passwordHash: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      },
      select: {
        id: true,
        email: true
      }
    });
  }

  // Update user profile
  static async updateProfile(userId: string, updates: UserUpdateData) {
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

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email }
    });
    return count > 0;
  }

  // Delete user (for testing or admin purposes)
  static async delete(userId: string) {
    return await prisma.user.delete({
      where: { id: userId },
      select: { id: true }
    });
  }
}

export default UserModel;
