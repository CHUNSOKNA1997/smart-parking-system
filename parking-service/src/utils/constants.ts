// Application constants

module.exports = {
  // Token expiry
  TOKEN_EXPIRY: {
    ACCESS: '7d',
    VERIFICATION: '24h',
    RESET: '1h'
  },

  // User status
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended'
  },

  // Email templates
  EMAIL_SUBJECTS: {
    VERIFICATION: 'Verify Your Email - Smart Parking',
    RESET_PASSWORD: 'Reset Your Password - Smart Parking',
    WELCOME: 'Welcome to Smart Parking'
  },

  // Validation
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,

  // Error messages
  ERRORS: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    EMAIL_ALREADY_EXISTS: 'Email already registered',
    USER_NOT_FOUND: 'User not found',
    INVALID_TOKEN: 'Invalid or expired token',
    UNAUTHORIZED: 'Unauthorized access',
    SERVER_ERROR: 'Internal server error'
  },

  // Success messages
  SUCCESS: {
    REGISTRATION: 'Registration successful. Please check your email to verify your account.',
    LOGIN: 'Login successful',
    EMAIL_VERIFIED: 'Email verified successfully. You can now login.',
    PASSWORD_RESET_SENT: 'Password reset link sent to your email',
    PASSWORD_RESET: 'Password reset successful. You can now login with your new password.',
    VERIFICATION_SENT: 'Verification email sent successfully'
  }
};
