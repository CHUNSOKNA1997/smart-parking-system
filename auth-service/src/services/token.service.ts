import { v4 as uuidv4 } from "uuid";
import jwt, { SignOptions } from "jsonwebtoken";

export const generateAccessToken = (userId: string, email: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not set in environment");
  }

  const payload = { userId, email };

  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
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
