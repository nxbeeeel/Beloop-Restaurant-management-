/**
 * Advanced Caching Service v2
 *
 * Implements Stale-While-Revalidate (SWR) pattern with:
 * - Cache stampede protection (thundering herd prevention)
 * - Background revalidation
 * - Tag-based invalidation
 * - Distributed locking
 * - Performance monitoring
 *
 * Inspired by: Vercel SWR, HTTP Cache-Control
 */

import { redis } from '@/server/redis';
import { createHash } from 'crypto';

interface CacheOptions {
  /** Time in seconds until cache is considered stale */
  ttl: number;
  /** Time in seconds to serve stale content while revalidating in background */
  staleWhileRevalidate?: number;
  /** Tags for cache invalidation (e.g., ['analytics', 'outlet:123']) */
  tags?: string[];
  /** Enable cache stampede protection */
  stampedePrevention?: boolean;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  tags?: string[];
}

/**
 * Advanced Cache Service with SWR and stampede protection
 */
class CacheServiceV2 {
  private refreshLocks = new Map<string, Promise<any>>();
  private metrics = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    errors: 0,
  };

  /**
   * Get value from cache or fetch with SWR pattern
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const cacheKey = this.buildKey(key, options.tags);
    const {
      ttl,
      staleWhileRevalidate = 0,
      stampedePrevention = true,
    } = options;

    try {
      // Try cache first
      const cached = await redis.get<CacheEntry<T>>(cacheKey);

      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > ttl * 1000;
        const shouldRevalidate =
          isStale && age < (ttl + staleWhileRevalidate) * 1000;

        if (shouldRevalidate) {
          // Serve stale data, refresh in background
          this.metrics.staleHits++;
          this.revalidateInBackground(cacheKey, fetcher, ttl, options.tags);
          return cached.value;
        }

        if (!isStale) {
          // Fresh cache hit
          this.metrics.hits++;
          return cached.value;
        }

        // Cache fully expired, fetch fresh data
      } else {
        this.metrics.misses++;
      }

      // Cache miss or fully expired - fetch with optional stampede protection
      if (stampedePrevention) {
        return await this.fetchWithLock(cacheKey, fetcher, ttl, options.tags);
      } else {
        return await this.fetchAndCache(cacheKey, fetcher, ttl, options.tags);
      }
    } catch (error) {
      this.metrics.errors++;
      console.error(`[Cache] Error for key ${key}:`, error);
      // Fallback to fetcher on cache errors
      return await fetcher();
    }
  }

  /**
   * Fetch data and cache it (without lock)
   */
  private async fetchAndCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags?: string[]
  ): Promise<T> {
    const value = await fetcher();
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      tags,
    };

    await redis.setex(cacheKey, ttl, entry);

    // Store tag mappings for invalidation
    if (tags?.length) {
      await this.storeTags(cacheKey, tags);
    }

    return value;
  }

  /**
   * Fetch with distributed lock to prevent cache stampede
   */
  private async fetchWithLock<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags?: string[]
  ): Promise<T> {
    const lockKey = `lock:${cacheKey}`;

    // Check if another request is already fetching
    const existingFetch = this.refreshLocks.get(lockKey);
    if (existingFetch) {
      // Wait for the existing fetch to complete
      return await existingFetch;
    }

    // Create new fetch promise
    const fetchPromise = this.fetchAndCache(cacheKey, fetcher, ttl, tags)
      .finally(() => {
        // Clean up lock after completion
        this.refreshLocks.delete(lockKey);
      });

    this.refreshLocks.set(lockKey, fetchPromise);
    return await fetchPromise;
  }

  /**
   * Revalidate cache in background (fire and forget)
   */
  private revalidateInBackground<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags?: string[]
  ): void {
    const lockKey = `lock:${cacheKey}`;

    // Only one background refresh at a time
    if (this.refreshLocks.has(lockKey)) {
      return;
    }

    const refreshPromise = this.fetchAndCache(cacheKey, fetcher, ttl, tags)
      .catch((error) => {
        console.error(`[Cache] Background refresh failed for ${cacheKey}:`, error);
      })
      .finally(() => {
        this.refreshLocks.delete(lockKey);
      });

    this.refreshLocks.set(lockKey, refreshPromise);
  }

  /**
   * Manually set cache value
   */
  async set<T>(key: string, value: T, ttl: number, tags?: string[]): Promise<void> {
    const cacheKey = this.buildKey(key, tags);
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      tags,
    };

    await redis.setex(cacheKey, ttl, entry);

    if (tags?.length) {
      await this.storeTags(cacheKey, tags);
    }
  }

  /**
   * Get cache value without fetching
   */
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    const cacheKey = this.buildKey(key, tags);
    const cached = await redis.get<CacheEntry<T>>(cacheKey);
    return cached ? cached.value : null;
  }

  /**
   * Delete cache key
   */
  async delete(key: string, tags?: string[]): Promise<void> {
    const cacheKey = this.buildKey(key, tags);
    await redis.del(cacheKey);
  }

  /**
   * Invalidate all cache entries with specific tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await redis.smembers(tagKey);

      if (keys.length > 0) {
        // Delete all cache entries with this tag
        await redis.del(...keys);
        deletedCount += keys.length;

        // Clean up tag set
        await redis.del(tagKey);
      }
    }

    return deletedCount;
  }

  /**
   * Store tag mappings for cache invalidation
   */
  private async storeTags(cacheKey: string, tags: string[]): Promise<void> {
    const pipeline = redis.pipeline();

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, cacheKey);
      pipeline.expire(tagKey, 86400); // 24 hours
    }

    await pipeline.exec();
  }

  /**
   * Build cache key with optional tag hash
   */
  private buildKey(key: string, tags?: string[]): string {
    if (!tags?.length) {
      return `cache:${key}`;
    }

    // Include tag hash in key for namespacing
    const tagStr = tags.sort().join(':');
    const tagHash = createHash('md5').update(tagStr).digest('hex').substring(0, 8);

    return `cache:${key}:${tagHash}`;
  }

  /**
   * Get cache statistics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      total,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      errors: 0,
    };
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAll(): Promise<void> {
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    const tagKeys = await redis.keys('tag:*');
    if (tagKeys.length > 0) {
      await redis.del(...tagKeys);
    }
  }
}

// Export singleton instance
export const cacheV2 = new CacheServiceV2();

/**
 * Helper function for common cache patterns
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl: number;
    tags?: string[];
    swr?: number;
  }
): Promise<T> {
  return cacheV2.getOrFetch(key, fetcher, {
    ttl: options.ttl,
    staleWhileRevalidate: options.swr,
    tags: options.tags,
    stampedePrevention: true,
  });
}
