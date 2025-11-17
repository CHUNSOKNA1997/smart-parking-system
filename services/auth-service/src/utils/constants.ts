// Application constants

export default {
	// Token expiry
	TOKEN_EXPIRY: {
		ACCESS: "7d",
		VERIFICATION: "24h",
		RESET: "1h",
	},

	// User status
	USER_STATUS: {
		ACTIVE: "active",
		INACTIVE: "inactive",
		SUSPENDED: "suspended",
	},

	// Email templates
	EMAIL_SUBJECTS: {
		VERIFICATION: "Verify Your Email - Smart Parking",
		RESET_PASSWORD: "Reset Your Password - Smart Parking",
		WELCOME: "Welcome to Smart Parking",
	},

	// Validation
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_MAX_LENGTH: 100,
};
