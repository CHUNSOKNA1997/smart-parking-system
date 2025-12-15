import { Request } from "express";

// Type definitions for auth service
// Extend Express Request to include user from JWT
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
}

// User registration data
export interface RegisterData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

// User creation data for model (OTP-based verification)
export interface UserCreateData {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    verificationOtp: string;
    otpExpiry: Date;
}

// User update data
export interface UserUpdateData {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

// Email service types
export interface EmailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
}
