import NodeCache from 'node-cache';
import type { ICacheAdapter, CacheAdapterConfig, CacheAdapterStats } from './cache-adapter.interface.js';

/**
 * Memory Cache Adapter
 *
 * Uses node-cache for in-memory caching.
 * This is the default adapter - no external dependencies required.
 */
export class MemoryCacheAdapter implements ICacheAdapter {
  private cache: NodeCache;
  private stats = { hits: 0, misses: 0 };
  private config: CacheAdapterConfig;

  constructor(config: CacheAdapterConfig) {
    this.config = config;
    this.cache = new NodeCache({
      stdTTL: config.defaultTTL,
      checkperiod: Math.min(config.defaultTTL / 2, 120),
      useClones: true,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const prefixedKey = this.prefixKey(key);
    const value = this.cache.get<T>(prefixedKey);

    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    return value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    return this.cache.set(prefixedKey, value, ttl ?? this.config.defaultTTL);
  }

  async del(key: string): Promise<number> {
    const prefixedKey = this.prefixKey(key);
    return this.cache.del(prefixedKey);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const prefixedPattern = this.prefixKey(pattern);
    // Convert glob pattern to regex-compatible pattern
    const regexPattern = prefixedPattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}`);

    const allKeys = this.cache.keys();
    let deletedCount = 0;

    for (const key of allKeys) {
      if (regex.test(key)) {
        this.cache.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = this.cache.keys();

    if (!pattern) {
      return allKeys.map(k => this.unprefixKey(k));
    }

    const prefixedPattern = this.prefixKey(pattern);
    const regexPattern = prefixedPattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}`);

    return allKeys
      .filter(key => regex.test(key))
      .map(k => this.unprefixKey(k));
  }

  async has(key: string): Promise<boolean> {
    const prefixedKey = this.prefixKey(key);
    return this.cache.has(prefixedKey);
  }

  async flushAll(): Promise<void> {
    this.cache.flushAll();
  }

  getStats(): CacheAdapterStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.keys().length,
      connected: true,
    };
  }

  async getStatsAsync(): Promise<CacheAdapterStats> {
    return this.getStats();
  }

  isReady(): boolean {
    return true; // Memory cache is always ready
  }

  async connect(): Promise<void> {
    // No-op for memory cache
  }

  async disconnect(): Promise<void> {
    this.cache.flushAll();
  }

  private prefixKey(key: string): string {
    if (this.config.keyPrefix) {
      return `${this.config.keyPrefix}:${key}`;
    }
    return key;
  }

  private unprefixKey(key: string): string {
    if (this.config.keyPrefix && key.startsWith(`${this.config.keyPrefix}:`)) {
      return key.slice(this.config.keyPrefix.length + 1);
    }
    return key;
  }
}
