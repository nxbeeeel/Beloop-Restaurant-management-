import { redis } from '@/lib/redis';

export class CacheService {
    /**
     * Get value from cache or fetch from source and cache it.
     * @param key Redis key
     * @param fetcher Async function to fetch data if cache miss
     * @param ttlSeconds Time to live in seconds (default 1 hour)
     */
    static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
        if (!redis) return fetcher();
        try {
            const cached = await redis.get<T>(key);
            if (cached) return cached;
            const result = await fetcher();

            // Only cache if result is not null/undefined to avoid caching empty states erroneously
            if (result !== null && result !== undefined) {
                await redis.set(key, result, { ex: ttlSeconds });
            }
            return result;
        } catch (err) {
            console.error(`[CacheService] Error (${key}):`, err);
            return fetcher();
        }
    }

    /**
     * Invalidate a specific key or pattern.
     * @param key Key to delete
     */
    static async invalidate(key: string): Promise<void> {
        if (!redis) return;
        try {
            await redis.del(key);
        } catch (err) {
            console.error(`[CacheService] Delete Error (${key}):`, err);
        }
    }

    /**
     * Invalidate keys matching a pattern.
     */
    static async invalidatePattern(pattern: string): Promise<void> {
        if (!redis) return;
        try {
            const keys = await redis.keys(pattern);
            if (keys && keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (err) {
            console.error(`[CacheService] Invalidate Pattern Error (${pattern}):`, err);
        }
    }

    // Standardized Key Generators
    static keys = {
        menu: (outletId: string) => `menu:${outletId}`,
        inventory: (outletId: string) => `inventory:${outletId}`,
        brandStats: (tenantId: string) => `brand:stats:${tenantId}`,
    }
}
