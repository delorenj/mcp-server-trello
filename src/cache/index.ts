/**
 * Cache Module
 *
 * Provides a pluggable caching layer with support for:
 * - In-memory caching (node-cache) - default, no external dependencies
 * - Valkey/Redis caching - optional, for persistent/shared caching
 */

export type {
  ICacheAdapter,
  CacheAdapterConfig,
  CacheAdapterStats,
  CacheConfig,
  CacheStoreType,
} from './cache-adapter.interface.js';

export { MemoryCacheAdapter } from './memory-cache-adapter.js';
export { ValkeyCacheAdapter, type ValkeyCacheAdapterConfig } from './valkey-cache-adapter.js';

import type { ICacheAdapter, CacheConfig, CacheStoreType } from './cache-adapter.interface.js';
import { MemoryCacheAdapter } from './memory-cache-adapter.js';
import { ValkeyCacheAdapter } from './valkey-cache-adapter.js';

/**
 * Load cache configuration from environment variables
 */
export function loadCacheConfig(): CacheConfig {
  const storeEnv = process.env.TRELLO_CACHE_STORE?.toLowerCase();
  let store: CacheStoreType = 'memory';

  if (storeEnv === 'valkey' || storeEnv === 'redis') {
    store = 'valkey';
  }

  const enabledEnv = process.env.TRELLO_CACHE_ENABLED;
  const enabled = enabledEnv !== 'false' && enabledEnv !== '0';

  return {
    store,
    enabled,
    valkeyUrl: process.env.TRELLO_VALKEY_URL || process.env.TRELLO_REDIS_URL || 'redis://localhost:6379',
    connectTimeout: parseInt(process.env.TRELLO_CACHE_CONNECT_TIMEOUT || '5000', 10),
    keyPrefix: process.env.TRELLO_CACHE_KEY_PREFIX || 'trello-mcp',
  };
}

/**
 * Create a cache adapter based on configuration
 *
 * @param config Cache configuration
 * @param defaultTTL Default TTL in seconds
 * @returns Cache adapter instance
 */
export async function createCacheAdapter(
  config: CacheConfig,
  defaultTTL: number = 120
): Promise<ICacheAdapter> {
  if (config.store === 'valkey') {
    console.log('[Cache] Using Valkey/Redis cache adapter');
    const adapter = new ValkeyCacheAdapter({
      url: config.valkeyUrl || 'redis://localhost:6379',
      defaultTTL,
      keyPrefix: config.keyPrefix,
      connectTimeout: config.connectTimeout,
    });

    try {
      await adapter.connect();
      return adapter;
    } catch (error) {
      console.warn('[Cache] Failed to connect to Valkey/Redis, falling back to memory cache:', error);
      // Fall back to memory cache if Valkey connection fails
      return new MemoryCacheAdapter({
        defaultTTL,
        keyPrefix: config.keyPrefix,
      });
    }
  }

  console.log('[Cache] Using in-memory cache adapter');
  return new MemoryCacheAdapter({
    defaultTTL,
    keyPrefix: config.keyPrefix,
  });
}

/**
 * Create a cache adapter synchronously (memory only)
 * Use this when you can't use async initialization
 */
export function createMemoryCacheAdapter(
  defaultTTL: number = 120,
  keyPrefix?: string
): ICacheAdapter {
  return new MemoryCacheAdapter({
    defaultTTL,
    keyPrefix,
  });
}
