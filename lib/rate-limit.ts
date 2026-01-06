import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/server/redis';
import { TRPCError } from '@trpc/server';

/**
 * Rate Limiting Service
 *
 * Provides configurable rate limiters for different API contexts:
 * - POS endpoints (stricter - per outlet)
 * - Admin endpoints (standard)
 * - Auth endpoints (strictest - per IP)
 *
 * Uses the centralized Redis instance from server/redis.ts
 */

// Rate limit configurations
export const RATE_LIMITS = {
    pos: { requests: 100, window: '1 m' as const },      // 100 req/min per outlet
    admin: { requests: 300, window: '1 m' as const },    // 300 req/min per user
    auth: { requests: 5, window: '10 s' as const },      // 5 attempts per 10 seconds (stricter)
    public: { requests: 60, window: '1 m' as const },    // 60 req/min for public APIs
    invite: { requests: 10, window: '1 h' as const },    // 10 invites/hour per user
} as const;

// Create rate limiters
function createLimiter(prefix: string, config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS]) {
    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `ratelimit:${prefix}`,
        analytics: true,
    });
}

// Lazy-initialized limiters
let posLimiter: Ratelimit | null = null;
let adminLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;

export function getPosRateLimiter(): Ratelimit {
    if (!posLimiter) posLimiter = createLimiter('pos', RATE_LIMITS.pos);
    return posLimiter;
}

export function getAdminRateLimiter(): Ratelimit {
    if (!adminLimiter) adminLimiter = createLimiter('admin', RATE_LIMITS.admin);
    return adminLimiter;
}

export function getAuthRateLimiter(): Ratelimit {
    if (!authLimiter) authLimiter = createLimiter('auth', RATE_LIMITS.auth);
    return authLimiter;
}

let inviteLimiter: Ratelimit | null = null;

export function getInviteRateLimiter(): Ratelimit {
    if (!inviteLimiter) inviteLimiter = createLimiter('invite', RATE_LIMITS.invite);
    return inviteLimiter;
}

/**
 * Extract client IP from request headers
 * Supports various proxy headers (Vercel, Cloudflare, etc.)
 */
export function getClientIp(headers: Headers): string {
    // Check common proxy headers
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp;

    const cfConnectingIp = headers.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp;

    // Fallback to a default (shouldn't happen in production)
    return 'unknown';
}

/**
 * Check rate limit and throw if exceeded
 */
export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string,
    context: string = 'API'
): Promise<{ remaining: number; reset: number }> {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);

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
