import { Redis } from '@upstash/redis';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis =
    globalForRedis.redis ||
    new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || 'https://sharing-monarch-42412.upstash.io',
        token: process.env.UPSTASH_REDIS_REST_TOKEN || 'AaWsAAIncDJhZjI2MmNjNzk5NDM0MWEzYjBkODRmYTQyYzViNWFhY3AyNDI0MTI',
    });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

