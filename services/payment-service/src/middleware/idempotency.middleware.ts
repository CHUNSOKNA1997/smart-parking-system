import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Extend Express Request to include idempotency properties
declare global {
    namespace Express {
        interface Request {
            idempotencyKey?: string;
            shouldCacheResponse?: boolean;
        }
    }
}

/**
 * Idempotency Middleware
 * Prevents duplicate payment creation from retry requests
 * 
 * How it works:
 * 1. Client sends 'Idempotency-Key' header (UUID recommended)
 * 2. We hash the request body to detect if request content changed
 * 3. If key exists with same request hash: return cached response
 * 4. If key exists with different hash: reject (key reused incorrectly)
 * 5. If key is new: continue, flag response to be cached
 * 
 * Keys expire after 24 hours
 */
export const idempotencyMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Only apply to POST requests for payment creation
    if (req.method !== 'POST') {
        return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string;

    // If no idempotency key provided, continue without caching
    // This maintains backward compatibility with existing clients
    if (!idempotencyKey) {
        console.log('[IDEMPOTENCY] No idempotency key provided, continuing without cache');
        return next();
    }

    try {
        // Hash the request body to detect if content changed
        const requestBody = JSON.stringify(req.body);
        const requestHash = crypto
            .createHash('sha256')
            .update(requestBody)
            .digest('hex');

        console.log('[IDEMPOTENCY] Checking key:', idempotencyKey);

        // Check if this idempotency key exists
        const existingKey = await prisma.idempotencyKey.findUnique({
            where: { key: idempotencyKey },
        });

        if (existingKey) {
            // Check if key has expired
            if (new Date() > existingKey.expiresAt) {
                console.log('[IDEMPOTENCY] Key expired, deleting and continuing');
                await prisma.idempotencyKey.delete({
                    where: { key: idempotencyKey },
                });
                // Continue to create new request
                req.idempotencyKey = idempotencyKey;
                req.shouldCacheResponse = true;
                return next();
            }

            // Check if request body matches
            if (existingKey.requestHash === requestHash) {
                console.log('[IDEMPOTENCY] Duplicate request detected, returning cached response');
                // Return cached response
                return res.status(existingKey.statusCode).json(existingKey.response);
            } else {
                console.log('[IDEMPOTENCY] ERROR: Same key used with different request body');
                return res.status(409).json({
                    error: 'IDEMPOTENCY_KEY_REUSED',
                    message: 'Idempotency key already used with different request parameters',
                });
            }
        }

        // New idempotency key - flag for caching
        console.log('[IDEMPOTENCY] New key, will cache response');
        req.idempotencyKey = idempotencyKey;
        req.shouldCacheResponse = true;

        // Store request hash in request for later use
        (req as any).requestHash = requestHash;

        next();
    } catch (error) {
        console.error('[IDEMPOTENCY] Error checking idempotency key:', error);
        // On error, continue without idempotency (fail open)
        next();
    }
};

/**
 * Helper function to cache response
 * Called from controller after successful payment creation
 */
export const cacheIdempotentResponse = async (
    idempotencyKey: string,
    requestHash: string,
    statusCode: number,
    response: any
) => {
    try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

        await prisma.idempotencyKey.create({
            data: {
                key: idempotencyKey,
                requestHash,
                response,
                statusCode,
                expiresAt,
            },
        });

        console.log('[IDEMPOTENCY] Response cached for key:', idempotencyKey);
    } catch (error) {
        console.error('[IDEMPOTENCY] Error caching response:', error);
        // Don't throw - caching failure shouldn't break the payment flow
    }
};

/**
 * Cleanup job to remove expired idempotency keys
 * Should be run periodically (e.g., daily via cron)
 */
export const cleanupExpiredKeys = async () => {
    try {
        const result = await prisma.idempotencyKey.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });

        console.log(`[IDEMPOTENCY] Cleaned up ${result.count} expired keys`);
        return result.count;
    } catch (error) {
        console.error('[IDEMPOTENCY] Error cleaning up expired keys:', error);
        return 0;
    }
};
