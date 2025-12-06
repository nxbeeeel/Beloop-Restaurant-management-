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
            if (result) await redis.set(key, result, { ex: ttlSeconds });
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
     * Uses manual scan loop for compatibility.
     */
    static async invalidatePattern(pattern: string): Promise<void> {
        if (!redis) return;
        let cursor = 0;
        do {
            // @ts-ignore - Upstash types might vary
            const result = await redis.scan(cursor, { match: pattern, count: 100 });
            // result is [cursor, keys[]] or { cursor, keys } depending on client version
            // For @upstash/redis v1.x http client, it usually returns [cursor, keys]
            const nextCursor = result[0];
            const keys = result[1];

            cursor = Number(nextCursor);

            if (keys && keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== 0);
    }

    // Key Generators
    static keys = {
        // Inventory
        inventoryList: (outletId: string) => `inventory:list:${outletId}`,
        lowStock: (outletId: string) => `inventory:low:${outletId}`,

        // Menu
        menuItem: (productId: string) => `menu:item:${productId}`,
        fullMenu: (outletId: string) => `menu:full:${outletId}`,

        // Reports -> Keys managed in specific routers, but consistent naming preferred
    }
}
