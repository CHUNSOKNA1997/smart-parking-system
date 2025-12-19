import rateLimit from "express-rate-limit";

/**
 * Rate limiter for booking creation
 * Prevents spam booking attempts
 * 10 bookings per 15 minutes per IP
 */
export const bookingCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 booking attempts per window
    message: "Too many booking attempts. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter for parking service
 * 200 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 requests per window
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
