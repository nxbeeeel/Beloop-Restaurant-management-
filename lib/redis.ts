import { Redis } from '@upstash/redis';

const redisClient = () => {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        return new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    // Fallback or mock for development if credentials are missing
    // For now, return null or a mock if you prefer, but let's assume env vars are set or will be set.
    // If not set, we can return null and handle it in the usage.
    console.warn("Redis credentials not found. Caching will be disabled.");
    return null;
};

export const redis = redisClient();

export async function cacheGetOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
    if (!redis) return fetcher();
    try {
        const cached = await redis.get<T>(key);
        if (cached) return cached;
        const result = await fetcher();
        if (result) await redis.set(key, result, { ex: ttlSeconds });
        return result;
    } catch (err) {
        console.error(`Redis Error (${key}):`, err);
        return fetcher();
    }
}
