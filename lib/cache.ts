/**
 * Zero-Lag Cache Utility
 * 
 * Uses Upstash Redis for blazing-fast data caching.
 * Provides consistent cache patterns across the application.
 * 
 * Usage:
 *   const data = await cache.getOrSet('key', fetchFunction, 300);
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
// You MUST set these environment variables:
// - UPSTASH_REDIS_REST_URL
// - UPSTASH_REDIS_REST_TOKEN
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Check if Redis is configured
const isRedisConfigured = () => {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Cache key prefixes for organization
export const CacheKeys = {
    // Dashboard stats (most accessed)
    dashboardStats: (outletId: string) => `dashboard:${outletId}`,

    // Menu/Products (rarely change)
    products: (outletId: string) => `products:${outletId}`,
    categories: (outletId: string) => `categories:${outletId}`,

    // Suppliers
    suppliers: (tenantId: string) => `suppliers:${tenantId}`,

    // Inventory
    ingredients: (outletId: string) => `ingredients:${outletId}`,
    lowStock: (outletId: string) => `lowstock:${outletId}`,

    // Daily data (invalidate at end of day)
    todaySales: (outletId: string) => `today:sales:${outletId}`,
    todayExpenses: (outletId: string) => `today:expenses:${outletId}`,
};

// Default TTL values (in seconds)
export const CacheTTL = {
    INSTANT: 60,           // 1 minute - for frequently changing data
    SHORT: 300,            // 5 minutes - dashboard stats
    MEDIUM: 900,           // 15 minutes - inventory
    LONG: 3600,            // 1 hour - products, categories
    VERY_LONG: 86400,      // 24 hours - rarely changing config
};

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    if (!isRedisConfigured()) return null;

    try {
        const data = await redis.get<T>(key);
        return data;
    } catch (error) {
        console.error('[Cache] Get error:', error);
        return null;
    }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = CacheTTL.SHORT): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
        await redis.setex(key, ttlSeconds, value);
    } catch (error) {
        console.error('[Cache] Set error:', error);
    }
}

/**
 * Get from cache or compute and cache
 * This is the main pattern for zero-lag loading
 */
export async function getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = CacheTTL.SHORT
): Promise<T> {
    // Try cache first
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch from source
    const data = await fetcher();

    // Cache in background (don't wait)
    cacheSet(key, data, ttlSeconds).catch(() => { });

    return data;
}

/**
 * Invalidate a single cache key
 */
export async function invalidate(key: string): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
        await redis.del(key);
    } catch (error) {
        console.error('[Cache] Invalidate error:', error);
    }
}

/**
 * Invalidate multiple keys by pattern
 * Use with caution - scans the keyspace
 */
export async function invalidatePattern(pattern: string): Promise<void> {
    if (!isRedisConfigured()) return;

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('[Cache] Invalidate pattern error:', error);
    }
}

/**
 * Invalidate all cache for an outlet
 * Call this when major data changes
 */
export async function invalidateOutlet(outletId: string): Promise<void> {
    await invalidatePattern(`*:${outletId}`);
}

/**
 * Invalidate dashboard stats (call after sales, expenses, etc.)
 */
export async function invalidateDashboard(outletId: string): Promise<void> {
    await invalidate(CacheKeys.dashboardStats(outletId));
    await invalidate(CacheKeys.todaySales(outletId));
    await invalidate(CacheKeys.todayExpenses(outletId));
}

/**
 * Invalidate products cache (call after menu updates)
 */
export async function invalidateProducts(outletId: string): Promise<void> {
    await invalidate(CacheKeys.products(outletId));
    await invalidate(CacheKeys.categories(outletId));
}

/**
 * Invalidate inventory cache (call after stock changes)
 */
export async function invalidateInventory(outletId: string): Promise<void> {
    await invalidate(CacheKeys.ingredients(outletId));
    await invalidate(CacheKeys.lowStock(outletId));
}

// Export the raw redis client for advanced use
export { redis };
