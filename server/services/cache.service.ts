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
        // Inventory / Products
        inventoryList: (outletId: string) => `outlet:${outletId}:inventory`,
        fullMenu: (outletId: string) => `outlet:${outletId}:menu:full`,
        lowStock: (outletId: string) => `outlet:${outletId}:stock:low`,
        menuItem: (productId: string) => `product:${productId}:details`,
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
     * Direct Set (Manual Cache Write)
     */
    static async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        if (!redis) return;
        try {
            await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
        } catch (err) {
            console.error(`Redis Set Error (${key}):`, err);
        }
    }

    /**
     * Direct Get (Manual Cache Read)
     */
    static async get<T>(key: string): Promise<T | null> {
        if (!redis) return null;
        try {
            const val = await redis.get<string | null>(key);
            if (!val) return null;
            // Handle both string and object responses depending on Redis client config
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val) as T;
                } catch {
                    return val as unknown as T;
                }
            }
            return val as T;
        } catch (err) {
            console.error(`Redis Get Error (${key}):`, err);
            return null;
        }
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
