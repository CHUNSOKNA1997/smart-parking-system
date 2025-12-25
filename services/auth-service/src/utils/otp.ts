/**
 * Generates a random 6-digit OTP (One-Time Password).
 *
 * @returns 6-digit numeric string
 */
export const generateOTP = (): string => {
    // Generate a random 6-digit numeric OTP as a zero-padded string
    const otp = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
    return otp;
};

/**
 * Calculates the expiry time for email verification OTPs.
 *
 * @returns Date object set to 5 minutes from current time
 */
export const getOTPExpiry = (): Date => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    return expiry;
};

/**
 * Calculates the expiry time for password reset OTPs.
 *
 * @returns Date object set to 10 minutes from current time
 */
export const getResetOTPExpiry = (): Date => {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
};

/**
 * Checks whether an OTP has expired by comparing expiry date with current time.
 *
 * @param expiry - OTP expiration date
 * @returns True if OTP is expired, false otherwise
 */
export const isOTPExpired = (expiry: Date): boolean => {
    return new Date() > expiry;
};
