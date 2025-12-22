/**
 * Cache Adapter Interface
 *
 * Defines the contract for cache storage backends.
 * Implementations can use in-memory storage (node-cache),
 * Valkey/Redis, or other storage systems.
 */

/**
 * Cache adapter configuration
 */
export interface CacheAdapterConfig {
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

/**
 * Cache adapter statistics
 */
export interface CacheAdapterStats {
  hits: number;
  misses: number;
  keys: number;
  connected: boolean;
}

/**
 * Cache adapter interface
 * All cache backends must implement this interface
 */
export interface ICacheAdapter {
  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time-to-live in seconds (optional, uses default if not provided)
   * @returns True if successful
   */
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * Delete a specific key from the cache
   * @param key The cache key
   * @returns Number of keys deleted
   */
  del(key: string): Promise<number>;

  /**
   * Delete all keys matching a pattern/prefix
   * @param pattern The pattern to match (e.g., "cards:*")
   * @returns Number of keys deleted
   */
  deleteByPattern(pattern: string): Promise<number>;

  /**
   * Get all keys matching a pattern
   * @param pattern The pattern to match
   * @returns Array of matching keys
   */
  keys(pattern?: string): Promise<string[]>;

  /**
   * Check if a key exists
   * @param key The cache key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Flush all keys from the cache
   */
  flushAll(): Promise<void>;

  /**
   * Get cache statistics (sync - may not reflect real-time for external stores)
   */
  getStats(): CacheAdapterStats;

  /**
   * Get cache statistics (async - fetches real-time stats from external stores)
   */
  getStatsAsync(): Promise<CacheAdapterStats>;

  /**
   * Check if the adapter is connected and ready
   */
  isReady(): boolean;

  /**
   * Connect to the cache backend (if applicable)
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the cache backend (if applicable)
   */
  disconnect(): Promise<void>;
}

/**
 * Cache store type for configuration
 */
export type CacheStoreType = 'memory' | 'valkey';

/**
 * Full cache configuration including store selection
 */
export interface CacheConfig {
  /** Which cache store to use */
  store: CacheStoreType;
  /** Whether caching is enabled */
  enabled: boolean;
  /** Valkey/Redis URL (only for valkey store) */
  valkeyUrl?: string;
  /** Connection timeout in milliseconds */
  connectTimeout?: number;
  /** Key prefix for all cache keys */
  keyPrefix?: string;
}
