import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

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

// Generate verification token (UUID)
export const generateVerificationToken = (): string => {
	return uuidv4();
};

// Generate password reset token (UUID)
export const generateResetToken = (): string => {
	return uuidv4();
};

// Verify JWT token
export const verifyToken = (token: string): any | null => {
	try {
		return jwt.verify(token, process.env.JWT_SECRET as string);
	} catch (error) {
		return null;
	}
};
