import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates a JWT access token for authenticated users.
 *
 * @param userId - Unique user identifier
 * @param email - User's email address
 * @param firstName - User's first name (optional)
 * @param lastName - User's last name (optional)
 * @returns Signed JWT token with configured expiration
 */
export const generateAccessToken = (
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string
): string => {
    const payload = {
        userId,
        email,
        firstName,
        lastName,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: (process.env.JWT_EXPIRE || "7d") as any,
    });
};

/**
 * Generates a unique verification token using UUID v4.
 *
 * @returns UUID string for email verification
 */
export const generateVerificationToken = (): string => {
    return uuidv4();
};

/**
 * Generates a unique password reset token using UUID v4.
 *
 * @returns UUID string for password reset
 */
export const generateResetToken = (): string => {
    return uuidv4();
};

/**
 * Generates a refresh token for session renewal.
 *
 * @returns Refresh token string
 */
export const generateRefreshToken = (): string => {
    return uuidv4();
};

/**
 * Hashes a token using SHA-256 for secure storage.
 *
 * @param token - Raw token string
 * @returns SHA-256 hash
 */
export const hashToken = (token: string): string => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
