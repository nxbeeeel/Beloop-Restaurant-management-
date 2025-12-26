import { cacheGetOrSet, redis } from '@/lib/redis';

/**
 * CacheService Wrapper
 * 
 * Provides a standardized interface for caching across the application.
 * Wraps the underlying Redis implementation from @/lib/redis.
 */
export class CacheService {
    /**
     * Cache key patterns for different entity types
     */
    static keys = {
        outletSettings: (outletId: string) => `outlet:${outletId}:settings`,
        outletDetails: (outletId: string) => `outlet:${outletId}:details`,
        tenantSettings: (tenantId: string) => `tenant:${tenantId}:settings`,
        userSession: (userId: string) => `user:${userId}:session`,
        dashboardStats: (outletId: string) => `dashboard:${outletId}:stats`,
    };

    /**
     * Get a value from cache or fetch it if missing.
     * @param key Cache key
     * @param fetcher Async function to fetch data if cache miss
     * @param ttlSeconds Time to live in seconds (default 3600)
     */
    static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
        return cacheGetOrSet(key, fetcher, ttlSeconds);
    }

    /**
     * Invalidate a cache key
     * @param key Cache key to invalidate
     */
    static async invalidate(key: string): Promise<void> {
        if (!redis) return;
        try {
            await redis.del(key);
        } catch (err) {
            console.error(`Redis Delete Error (${key}):`, err);
        }
    }
}
