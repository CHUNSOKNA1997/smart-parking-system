import { Request } from 'express';

// Extend Express Request to include user from JWT
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// Booking creation data
export interface BookingCreateData {
  userId: string;
  spotId: string;
  durationHours: number;
  totalPrice: number;
  qrCode: string | null;
}

// Transaction creation data
export interface TransactionCreateData {
  bookingId?: string | null;
  userId: string;
  amount: number;
  paymentMethod?: string;
  description?: string;
}

// User update data
export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// QR Code data
export interface QRCodeData {
  bookingId: string;
  spotId: string;
  userId: string;
  startTime: string;
  generatedAt?: string;
}
