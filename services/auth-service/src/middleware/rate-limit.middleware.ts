import rateLimit from "express-rate-limit";

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks on login endpoint
 * 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    max: 5, // Max 5 login attempts per window
    message: "Too many login attempts. Please try again after 2 minutes.",
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count all requests
});

/**
 * Rate limiter for user registration
 * Prevents spam account creation
 * 3 registrations per hour per IP
 */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 registrations per hour
    message: "Too many accounts created. Please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for OTP verification attempts
 * Prevents brute force attacks on 6-digit OTP
 * 10 attempts per 15 minutes per IP
 */
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 OTP attempts per window
    message:
        "Too many verification attempts. Please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for password reset requests
 * Prevents spam of reset emails
 * Development: 5 requests per 5 minutes (easier testing)
 * Production: Consider 3 requests per 15 minutes for tighter security
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes (for dev/testing)
    max: 5, // Max 5 password reset requests per window
    message:
        "Too many password reset requests. Please try again after 5 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter
 * Prevents excessive API usage
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per window
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
