// Application constants

export const TOKEN_EXPIRY = {
  ACCESS: '7d',
  VERIFICATION: '24h',
  RESET: '1h'
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

export const EMAIL_SUBJECTS = {
  VERIFICATION: 'Verify Your Email - Smart Parking',
  RESET_PASSWORD: 'Reset Your Password - Smart Parking',
  WELCOME: 'Welcome to Smart Parking'
};

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;

export const ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED: 'Unauthorized access',
  SERVER_ERROR: 'Internal server error'
};

export const SUCCESS = {
  REGISTRATION: 'Registration successful. Please check your email to verify your account.',
  LOGIN: 'Login successful',
  EMAIL_VERIFIED: 'Email verified successfully. You can now login.',
  PASSWORD_RESET_SENT: 'Password reset link sent to your email',
  PASSWORD_RESET: 'Password reset successful. You can now login with your new password.',
  VERIFICATION_SENT: 'Verification email sent successfully'
};

