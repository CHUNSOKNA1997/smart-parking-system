import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Generate JWT access token
export const generateAccessToken = (userId: string, email: string): string => {
  const payload = {
    userId,
    email
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
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
