// Generate 6-digit OTP
export const generateOTP = (): string => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get OTP expiry time (5 minutes from now) - for email verification
export const getOTPExpiry = (): Date => {
	const expiry = new Date();
	expiry.setMinutes(expiry.getMinutes() + 5);
	return expiry;
};

// Get Reset OTP expiry time (10 minutes from now) - for password reset
export const getResetOTPExpiry = (): Date => {
	const expiry = new Date();
	expiry.setMinutes(expiry.getMinutes() + 10);
	return expiry;
};

// Check if OTP is expired
export const isOTPExpired = (expiry: Date): boolean => {
	return new Date() > expiry;
};
