import { cacheGetOrSet } from '@/lib/redis';

/**
 * CacheService Wrapper
 * 
 * Provides a standardized interface for caching across the application.
 * Wraps the underlying Redis implementation from @/lib/redis.
 */
export class CacheService {
    /**
     * Get a value from cache or fetch it if missing.
     * @param key Cache key
     * @param fetcher Async function to fetch data if cache miss
     * @param ttlSeconds Time to live in seconds (default 3600)
     */
    static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
        return cacheGetOrSet(key, fetcher, ttlSeconds);
    }
}
