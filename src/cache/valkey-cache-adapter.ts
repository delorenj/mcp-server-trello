import type { ICacheAdapter, CacheAdapterConfig, CacheAdapterStats } from './cache-adapter.interface.js';

/**
 * Valkey/Redis client type
 * Using dynamic import to make redis an optional dependency
 */
type RedisClientType = Awaited<ReturnType<typeof import('redis')['createClient']>>;

/**
 * Valkey Cache Adapter Configuration
 */
export interface ValkeyCacheAdapterConfig extends CacheAdapterConfig {
  /** Valkey/Redis URL (e.g., redis://localhost:6379) */
  url: string;
  /** Connection timeout in milliseconds */
  connectTimeout?: number;
  /** Retry strategy configuration */
  maxRetries?: number;
}

/**
 * Valkey Cache Adapter
 *
 * Uses the official 'redis' npm package to connect to Valkey/Redis.
 * Valkey is the open-source fork of Redis (BSD-3 license).
 *
 * This adapter is OPTIONAL - the redis package is only loaded if this adapter is used.
 * Falls back gracefully if Valkey is unavailable.
 */
export class ValkeyCacheAdapter implements ICacheAdapter {
  private client: RedisClientType | null = null;
  private config: ValkeyCacheAdapterConfig;
  private stats = { hits: 0, misses: 0 };
  private ready = false;
  private connecting = false;

  constructor(config: ValkeyCacheAdapterConfig) {
    this.config = {
      connectTimeout: 5000,
      maxRetries: 3,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.ready || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      // Dynamic import to make redis optional
      const redis = await import('redis');

      this.client = redis.createClient({
        url: this.config.url,
        socket: {
          connectTimeout: this.config.connectTimeout,
          reconnectStrategy: (retries) => {
            if (retries > (this.config.maxRetries ?? 3)) {
              console.error('[ValkeyCacheAdapter] Max retries reached, giving up');
              return new Error('Max retries reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms...
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.client.on('error', (err) => {
        console.error('[ValkeyCacheAdapter] Connection error:', err.message);
        this.ready = false;
      });

      this.client.on('ready', () => {
        console.log('[ValkeyCacheAdapter] Connected to Valkey/Redis');
        this.ready = true;
      });

      this.client.on('end', () => {
        console.log('[ValkeyCacheAdapter] Disconnected from Valkey/Redis');
        this.ready = false;
      });

      await this.client.connect();
      this.ready = true;
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Failed to connect:', error);
      this.ready = false;
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.ready = false;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isReady() || !this.client) {
      this.stats.misses++;
      return undefined;
    }

    try {
      const prefixedKey = this.prefixKey(key);
      const value = await this.client.get(prefixedKey);

      if (value !== null) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      return undefined;
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Get error:', error);
      this.stats.misses++;
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      return false;
    }

    try {
      const prefixedKey = this.prefixKey(key);
      const serialized = JSON.stringify(value);
      const effectiveTTL = ttl ?? this.config.defaultTTL;

      if (effectiveTTL > 0) {
        await this.client.setEx(prefixedKey, effectiveTTL, serialized);
      } else {
        await this.client.set(prefixedKey, serialized);
      }

      return true;
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<number> {
    if (!this.isReady() || !this.client) {
      return 0;
    }

    try {
      const prefixedKey = this.prefixKey(key);
      return await this.client.del(prefixedKey);
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Del error:', error);
      return 0;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.isReady() || !this.client) {
      return 0;
    }

    try {
      const prefixedPattern = this.prefixKey(pattern);

      // Use KEYS command to get matching keys
      // Note: KEYS is blocking but acceptable for small datasets
      const keysToDelete = await this.client.keys(prefixedPattern);

      // No keys to delete
      if (!keysToDelete || keysToDelete.length === 0) {
        return 0;
      }

      // Delete keys individually
      let deletedCount = 0;
      for (const key of keysToDelete) {
        if (key && typeof key === 'string' && key.length > 0) {
          deletedCount += await this.client.del(key);
        }
      }
      return deletedCount;
    } catch (error) {
      console.error('[ValkeyCacheAdapter] DeleteByPattern error:', error);
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.isReady() || !this.client) {
      return [];
    }

    try {
      const searchPattern = pattern
        ? this.prefixKey(pattern)
        : this.prefixKey('*');

      // Use KEYS command (blocking but simple)
      const keys = await this.client.keys(searchPattern);
      return keys.map(k => this.unprefixKey(k));
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Keys error:', error);
      return [];
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      return false;
    }

    try {
      const prefixedKey = this.prefixKey(key);
      const exists = await this.client.exists(prefixedKey);
      return exists > 0;
    } catch (error) {
      console.error('[ValkeyCacheAdapter] Has error:', error);
      return false;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.isReady() || !this.client) {
      return;
    }

    try {
      // Only flush keys with our prefix to avoid affecting other applications
      if (this.config.keyPrefix) {
        await this.deleteByPattern('*');
      } else {
        // If no prefix, flush the entire database (use with caution)
        await this.client.flushDb();
      }
    } catch (error) {
      console.error('[ValkeyCacheAdapter] FlushAll error:', error);
    }
  }

  getStats(): CacheAdapterStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: -1, // Would require additional call to count
      connected: this.ready,
    };
  }

  isReady(): boolean {
    return this.ready && this.client !== null;
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
