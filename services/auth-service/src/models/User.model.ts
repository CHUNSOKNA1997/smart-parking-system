import prisma from "../config/prisma.js";
import { User } from "@prisma/client";
import { UserCreateData, UserUpdateData } from "../types/index.js";

class UserModel {
  // Create new user
  static async create(
    userData: UserCreateData
  ): Promise<
    Omit<
      User,
      | "passwordHash"
      | "verificationOtp"
      | "otpExpiry"
      | "resetToken"
      | "resetTokenExpiry"
      | "updatedAt"
    >
  > {
    const {
      firstName,
      lastName,
      email,
      passwordHash,
      verificationOtp,
      otpExpiry,
    } = userData;

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        verificationOtp,
        otpExpiry,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  // Find user by ID
  static async findById(
    userId: string
  ): Promise<Omit<
    User,
    "passwordHash" | "verificationToken" | "resetToken" | "resetTokenExpiry"
  > | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Find user by email and OTP
  static async findByOTP(email: string, otp: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        email,
        verificationOtp: otp,
        otpExpiry: {
          gt: new Date(), // OTP not expired
        },
      },
    });
  }

  // Find user by reset OTP
  static async findByResetOTP(email: string, otp: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        email,
        resetOtp: otp,
        resetOtpExpiry: {
          gt: new Date(), // Greater than now (not expired)
        },
      },
    });
  }

  // Update verification status after OTP verification
  static async verifyEmail(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationOtp: null,
        otpExpiry: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
      },
    });
  }

  // Update verification OTP
  static async updateVerificationOTP(userId: string, otp: string, expiry: Date) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        verificationOtp: otp,
        otpExpiry: expiry,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  // Set reset OTP
  static async setResetOTP(userId: string, otp: string, expiry: Date) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        resetOtp: otp,
        resetOtpExpiry: expiry,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  // Update password
  static async updatePassword(userId: string, passwordHash: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpiry: null,
      },
      select: {
        id: true,
        email: true,
      },
    });
  }

  // Update user profile
  static async updateProfile(userId: string, updates: UserUpdateData) {
    const { firstName, lastName } = updates;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        updatedAt: true,
      },
    });
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
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
