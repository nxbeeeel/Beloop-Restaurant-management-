import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { TRPCError } from '@trpc/server';

/**
 * Rate Limiting Service
 * 
 * Provides configurable rate limiters for different API contexts:
 * - POS endpoints (stricter - per outlet)
 * - Admin endpoints (standard)
 * - Auth endpoints (strictest - per IP)
 */

// Initialize Redis client (lazy - only if REDIS_URL is set)
let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn('[Rate Limit] Upstash Redis not configured - rate limiting disabled');
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

// Rate limit configurations
export const RATE_LIMITS = {
    pos: { requests: 100, window: '1 m' as const },      // 100 req/min per outlet
    admin: { requests: 300, window: '1 m' as const },    // 300 req/min per user
    auth: { requests: 5, window: '15 m' as const },      // 5 attempts per 15 min
    public: { requests: 60, window: '1 m' as const },    // 60 req/min for public APIs
    invite: { requests: 10, window: '1 h' as const },    // 10 invites/hour per user
} as const;

// Create rate limiters
function createLimiter(prefix: string, config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]) {
    const redisClient = getRedis();
    if (!redisClient) return null;

    return new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `ratelimit:${prefix}`,
        analytics: true,
    });
}

// Lazy-initialized limiters
let posLimiter: Ratelimit | null = null;
let adminLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;

export function getPosRateLimiter(): Ratelimit | null {
    if (!posLimiter) posLimiter = createLimiter('pos', RATE_LIMITS.pos);
    return posLimiter;
}

export function getAdminRateLimiter(): Ratelimit | null {
    if (!adminLimiter) adminLimiter = createLimiter('admin', RATE_LIMITS.admin);
    return adminLimiter;
}

export function getAuthRateLimiter(): Ratelimit | null {
    if (!authLimiter) authLimiter = createLimiter('auth', RATE_LIMITS.auth);
    return authLimiter;
}

let inviteLimiter: Ratelimit | null = null;

export function getInviteRateLimiter(): Ratelimit | null {
    if (!inviteLimiter) inviteLimiter = createLimiter('invite', RATE_LIMITS.invite);
    return inviteLimiter;
}

/**
 * Check rate limit and throw if exceeded
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string,
    context: string = 'API'
): Promise<{ remaining: number; reset: number }> {
    // If no limiter (Redis not configured), allow request
    if (!limiter) {
        return { remaining: -1, reset: 0 };
    }

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        console.warn(`[Rate Limit] ${context} limit exceeded for ${identifier}. Retry in ${retryAfter}s`);

        throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        });
    }

    return { remaining, reset };
}

/**
 * Rate limit info for response headers
 */
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Create rate limit headers for HTTP response
 */
export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': String(Math.ceil(info.reset / 1000)),
    };
}
