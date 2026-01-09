import Joi from "joi";
import constants from "../utils/constants.js";

const { PASSWORD_MIN_LENGTH } = constants;

// Register validation schema
const registerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
        "string.empty": "First name is required",
        "string.min": "First name must be at least 2 characters",
        "string.max": "First name must not exceed 50 characters",
    }),

    lastName: Joi.string().min(2).max(50).required().messages({
        "string.empty": "Last name is required",
        "string.min": "Last name must be at least 2 characters",
        "string.max": "Last name must not exceed 50 characters",
    }),

    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),

    password: Joi.string()
        .min(PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            "string.empty": "Password is required",
            "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        }),
});

// Login validation schema
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),

    password: Joi.string().required().messages({
        "string.empty": "Password is required",
    }),
});

// Email validation schema (for resend verification)
const emailSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),
});

// Verify reset OTP validation schema (for forgot-password/verify-otp)
const verifyResetOtpSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),

    otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
            "string.empty": "OTP is required",
            "string.length": "OTP must be 6 digits",
            "string.pattern.base": "OTP must contain only numbers",
        }),
});

// Reset password validation schema (after OTP verification)
const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),

    newPassword: Joi.string()
        .min(PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            "string.empty": "New password is required",
            "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        }),
});

// Change password schema (authenticated user)
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        "string.empty": "Current password is required",
    }),

    newPassword: Joi.string()
        .min(PASSWORD_MIN_LENGTH)
        .required()
        .messages({
            "string.empty": "New password is required",
            "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        }),
});

// Update user validation schema
const updateUserSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).messages({
        "string.min": "First name must be at least 2 characters",
        "string.max": "First name must not exceed 50 characters",
    }),

    lastName: Joi.string().min(2).max(50).messages({
        "string.min": "Last name must be at least 2 characters",
        "string.max": "Last name must not exceed 50 characters",
    }),

    phone: Joi.string().min(9).max(15).pattern(/^[0-9+]+$/).messages({
        "string.min": "Phone number must be at least 9 characters",
        "string.max": "Phone number must not exceed 15 characters",
        "string.pattern.base": "Phone number must contain only numbers and +",
    }),
}).min(1).messages({
    "object.min": "At least one field (firstName, lastName, phone) is required for update",
});

// OTP verification schema
const otpVerificationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
    }),

    otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
            "string.empty": "OTP is required",
            "string.length": "OTP must be 6 digits",
            "string.pattern.base": "OTP must contain only numbers",
        }),
});

export {
    registerSchema,
    loginSchema,
    emailSchema,
    verifyResetOtpSchema,
    resetPasswordSchema,
    otpVerificationSchema,
    updateUserSchema,
    changePasswordSchema,
};
