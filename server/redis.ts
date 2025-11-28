import Redis from "ioredis";

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis =
    globalForRedis.redis ||
    new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        lazyConnect: true,
        retryStrategy(times) {
            if (times > 3) {
                return null; // Stop retrying after 3 attempts
            }
            return Math.min(times * 50, 2000);
        },
    });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

redis.on("error", (err) => {
    console.warn("Redis connection error:", err.message);
});
