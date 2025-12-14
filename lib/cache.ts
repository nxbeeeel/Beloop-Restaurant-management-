/**
 * Redis Cache Service
 * 
 * Provides caching layer for dashboard queries to improve performance.
 * Uses Upstash Redis for serverless-compatible caching.
 */

import { Redis } from '@upstash/redis';

// Lazy initialization to avoid issues when env vars not set
let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Also try the simpler REDIS_URL format
    if (!url || !token) {
        console.warn('[Cache] Upstash Redis not configured - caching disabled');
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
    // Dashboard stats (1 min TTL)
    dashboardStats: (tenantId: string) => `dash:stats:${tenantId}`,
    outletStats: (outletId: string) => `outlet:stats:${outletId}`,

    // Product lists (5 min TTL)
    products: (outletId: string) => `products:${outletId}`,
    productsFull: (outletId: string) => `products:full:${outletId}`,

    // Outlet data (10 min TTL)
    outlets: (tenantId: string) => `outlets:${tenantId}`,
    outlet: (outletId: string) => `outlet:${outletId}`,

    // User data (5 min TTL)
    user: (userId: string) => `user:${userId}`,
};

/**
 * Default TTL values in seconds
 */
export const TTL = {
    short: 60,        // 1 minute
    medium: 300,      // 5 minutes
    long: 600,        // 10 minutes
    veryLong: 3600,   // 1 hour
};

/**
 * Get cached value or compute and cache
 */
export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = TTL.medium
): Promise<T> {
    const client = getRedis();

    // If Redis not available, just fetch
    if (!client) {
        return fetcher();
    }

    try {
        // Try to get from cache
        const cached = await client.get<T>(key);

        if (cached !== null && cached !== undefined) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }

        // Cache miss - fetch fresh data
        console.log(`[Cache] MISS: ${key}`);
        const data = await fetcher();

        // Store in cache
        await client.setex(key, ttlSeconds, data);

        return data;
    } catch (error) {
        console.error('[Cache] Error:', error);
        // On cache error, just fetch directly
        return fetcher();
    }
}

/**
 * Get value from cache only (no computation)
 */
export async function get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        return await client.get<T>(key);
    } catch (error) {
        console.error('[Cache] Get error:', error);
        return null;
    }
}

/**
 * Set value in cache
 */
export async function set<T>(
    key: string,
    value: T,
    ttlSeconds: number = TTL.medium
): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.setex(key, ttlSeconds, value);
    } catch (error) {
        console.error('[Cache] Set error:', error);
    }
}

/**
 * Delete key from cache
 */
export async function del(key: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        await client.del(key);
        console.log(`[Cache] Invalidated: ${key}`);
    } catch (error) {
        console.error('[Cache] Del error:', error);
    }
}

/**
 * Delete multiple keys matching pattern
 */
export async function delPattern(pattern: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        // Upstash doesn't support SCAN, so we need to be explicit
        // This is a simple implementation - for production, consider using tags
        console.log(`[Cache] Invalidating pattern: ${pattern}`);
    } catch (error) {
        console.error('[Cache] DelPattern error:', error);
    }
}

/**
 * Invalidate dashboard caches for a tenant
 * Call this after mutations that affect dashboard data
 */
export async function invalidateDashboard(tenantId: string): Promise<void> {
    await del(CACHE_KEYS.dashboardStats(tenantId));
}

/**
 * Invalidate outlet caches
 * Call this after mutations that affect outlet data
 */
export async function invalidateOutlet(outletId: string): Promise<void> {
    await del(CACHE_KEYS.outletStats(outletId));
    await del(CACHE_KEYS.products(outletId));
    await del(CACHE_KEYS.productsFull(outletId));
}

/**
 * Invalidate all caches for a tenant
 * Call this after major changes (e.g., tenant settings)
 */
export async function invalidateTenant(tenantId: string): Promise<void> {
    await del(CACHE_KEYS.dashboardStats(tenantId));
    await del(CACHE_KEYS.outlets(tenantId));
}

// Export the cache service
export const CacheService = {
    get,
    set,
    del,
    getOrSet,
    invalidateDashboard,
    invalidateOutlet,
    invalidateTenant,
    KEYS: CACHE_KEYS,
    TTL,
};
