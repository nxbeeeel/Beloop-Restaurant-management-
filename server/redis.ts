import { Redis } from '@upstash/redis';
import { getRequiredEnv } from '@/lib/env-validation';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis =
    globalForRedis.redis ||
    new Redis({
        url: getRequiredEnv('UPSTASH_REDIS_REST_URL'),
        token: getRequiredEnv('UPSTASH_REDIS_REST_TOKEN'),
    });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

