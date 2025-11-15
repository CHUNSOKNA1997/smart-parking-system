import jwt from "jsonwebtoken";
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
 * Verifies and decodes a JWT token.
 *
 * @param token - JWT token to verify
 * @returns Decoded token payload if valid, null if invalid
 */
export const verifyToken = (token: string): any | null => {
	try {
		return jwt.verify(token, process.env.JWT_SECRET as string);
	} catch (error) {
		return null;
	}
};
