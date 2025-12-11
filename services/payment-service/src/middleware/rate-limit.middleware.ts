import rateLimit from "express-rate-limit";

/**
 * Rate limiter for payment verification polling
 * Prevents excessive polling of payment status
 * 100 requests per minute per IP
 */
export const paymentVerificationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Max 100 verification checks per minute
    message:
        "Too many payment verification requests. Please slow down your polling.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for payment creation
 * Prevents spam payment creation
 * 10 payments per 15 minutes per IP
 */
export const paymentCreationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 payment creations per window
    message: "Too many payment creation requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter for payment service
 * 200 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 requests per window
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
