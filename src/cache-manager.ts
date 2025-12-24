import type { ICacheAdapter, CacheConfig } from './cache/index.js';
import { loadCacheConfig, createCacheAdapter, createMemoryCacheAdapter } from './cache/index.js';

/**
 * Cache TTL configuration (in seconds)
 * Configurable via environment variables
 */
export interface CacheTTLConfig {
  boards: number;      // Board metadata, workspaces
  lists: number;       // Lists on a board
  labels: number;      // Labels on a board
  members: number;     // Board members
  cards: number;       // Card data, checklists
  activities: number;  // Recent activity
}

/**
 * Default TTL values based on data volatility
 */
const DEFAULT_TTL: CacheTTLConfig = {
  boards: 6 * 60 * 60,      // 6 hours
  lists: 60 * 60,           // 1 hour
  labels: 6 * 60 * 60,      // 6 hours
  members: 12 * 60 * 60,    // 12 hours
  cards: 2 * 60,            // 2 minutes
  activities: 60,           // 1 minute
};

/**
 * Cache key prefixes for different resource types
 */
export enum CachePrefix {
  BOARDS = 'boards',
  BOARD = 'board',
  WORKSPACES = 'workspaces',
  WORKSPACE = 'workspace',
  BOARDS_IN_WORKSPACE = 'boards_in_workspace',
  LISTS = 'lists',
  CARDS_BY_LIST = 'cards_by_list',
  CARD = 'card',
  MY_CARDS = 'my_cards',
  CARD_COMMENTS = 'card_comments',
  CARD_HISTORY = 'card_history',
  CHECKLIST = 'checklist',
  CHECKLIST_ITEMS = 'checklist_items',
  BOARD_MEMBERS = 'board_members',
  BOARD_LABELS = 'board_labels',
  RECENT_ACTIVITY = 'recent_activity',
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  storeType: string;
  connected: boolean;
}

/**
 * TrelloCacheManager - Intelligent caching layer for Trello API calls
 *
 * Features:
 * - Pluggable cache adapters (memory, Valkey/Redis)
 * - Configurable via environment variables
 * - Write-through invalidation
 * - Cache statistics for monitoring
 * - Graceful fallback if external cache unavailable
 *
 * Environment Variables:
 * - TRELLO_CACHE_ENABLED: Enable/disable caching (default: true)
 * - TRELLO_CACHE_STORE: 'memory' (default) or 'valkey'
 * - TRELLO_VALKEY_URL: Valkey/Redis URL (default: redis://localhost:6379)
 * - TRELLO_CACHE_TTL_*: Override default TTLs for each resource type
 */
export class TrelloCacheManager {
  private adapter: ICacheAdapter;
  private enabled: boolean;
  private ttlConfig: CacheTTLConfig;
  private storeType: string;
  private initialized: boolean = false;

  constructor(adapter?: ICacheAdapter) {
    this.ttlConfig = this.loadTTLConfig();
    const config = loadCacheConfig();
    this.enabled = config.enabled;
    this.storeType = config.store;

    // Use provided adapter or create a memory adapter (sync initialization)
    this.adapter = adapter || createMemoryCacheAdapter(this.ttlConfig.cards, config.keyPrefix);
  }

  /**
   * Initialize async cache adapter (call this for Valkey support)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = loadCacheConfig();

    if (config.store === 'valkey' && config.enabled) {
      try {
        this.adapter = await createCacheAdapter(config, this.ttlConfig.cards);
        this.storeType = this.adapter.isReady() ? 'valkey' : 'memory';
      } catch (error) {
        console.warn('[TrelloCacheManager] Failed to initialize Valkey, using memory cache');
        this.storeType = 'memory';
      }
    }

    this.initialized = true;
  }

  /**
   * Load TTL configuration from environment variables
   */
  private loadTTLConfig(): CacheTTLConfig {
    return {
      boards: this.parseEnvInt('TRELLO_CACHE_TTL_BOARDS', DEFAULT_TTL.boards),
      lists: this.parseEnvInt('TRELLO_CACHE_TTL_LISTS', DEFAULT_TTL.lists),
      labels: this.parseEnvInt('TRELLO_CACHE_TTL_LABELS', DEFAULT_TTL.labels),
      members: this.parseEnvInt('TRELLO_CACHE_TTL_MEMBERS', DEFAULT_TTL.members),
      cards: this.parseEnvInt('TRELLO_CACHE_TTL_CARDS', DEFAULT_TTL.cards),
      activities: this.parseEnvInt('TRELLO_CACHE_TTL_ACTIVITIES', DEFAULT_TTL.activities),
    };
  }

  /**
   * Parse integer from environment variable with fallback
   */
  private parseEnvInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return defaultValue;
  }

  /**
   * Generate a cache key from prefix and identifiers
   */
  public generateKey(prefix: CachePrefix, ...parts: (string | number | undefined)[]): string {
    const validParts = parts.filter(p => p !== undefined && p !== null);
    return `${prefix}:${validParts.join(':')}`;
  }

  /**
   * Get a custom TTL for specific prefixes
   */
  private getTTLForPrefix(prefix: CachePrefix): number {
    switch (prefix) {
      case CachePrefix.BOARDS:
      case CachePrefix.BOARD:
      case CachePrefix.WORKSPACES:
      case CachePrefix.WORKSPACE:
      case CachePrefix.BOARDS_IN_WORKSPACE:
        return this.ttlConfig.boards;

      case CachePrefix.BOARD_LABELS:
        return this.ttlConfig.labels;

      case CachePrefix.BOARD_MEMBERS:
        return this.ttlConfig.members;

      case CachePrefix.LISTS:
        return this.ttlConfig.lists;

      case CachePrefix.RECENT_ACTIVITY:
        return this.ttlConfig.activities;

      case CachePrefix.CARDS_BY_LIST:
      case CachePrefix.CARD:
      case CachePrefix.MY_CARDS:
      case CachePrefix.CARD_COMMENTS:
      case CachePrefix.CARD_HISTORY:
      case CachePrefix.CHECKLIST:
      case CachePrefix.CHECKLIST_ITEMS:
        return this.ttlConfig.cards;

      default:
        return this.ttlConfig.cards;
    }
  }

  /**
   * Get a value from cache
   */
  public get<T>(prefix: CachePrefix, ...keyParts: (string | number | undefined)[]): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const key = this.generateKey(prefix, ...keyParts);
    // Synchronous wrapper for backward compatibility
    // The adapter's get is async but we need sync for existing code
    let result: T | undefined;

    // For memory adapter, we can access synchronously via a hack
    // For Valkey, this will return undefined (use getAsync instead)
    const adapter = this.adapter as any;
    if (adapter.cache && typeof adapter.cache.get === 'function') {
      // Memory adapter - direct access
      const prefixedKey = adapter.prefixKey ? adapter.prefixKey(key) : key;
      result = adapter.cache.get(prefixedKey);
      if (result !== undefined) {
        adapter.stats.hits++;
      } else {
        adapter.stats.misses++;
      }
    }

    return result;
  }

  /**
   * Get a value from cache (async version)
   */
  public async getAsync<T>(prefix: CachePrefix, ...keyParts: (string | number | undefined)[]): Promise<T | undefined> {
    if (!this.enabled) {
      return undefined;
    }

    const key = this.generateKey(prefix, ...keyParts);
    return this.adapter.get<T>(key);
  }

  /**
   * Set a value in cache
   */
  public set<T>(prefix: CachePrefix, value: T, ...keyParts: (string | number | undefined)[]): boolean {
    if (!this.enabled) {
      return false;
    }

    const key = this.generateKey(prefix, ...keyParts);
    const ttl = this.getTTLForPrefix(prefix);

    // Synchronous wrapper for backward compatibility
    const adapter = this.adapter as any;
    if (adapter.cache && typeof adapter.cache.set === 'function') {
      const prefixedKey = adapter.prefixKey ? adapter.prefixKey(key) : key;
      return adapter.cache.set(prefixedKey, value, ttl);
    }

    // For async adapters, fire and forget (but log errors for debugging)
    this.adapter.set(key, value, ttl).catch(error => {
      console.warn(`[TrelloCacheManager] Async set failed for key '${key}':`, error);
    });
    return true;
  }

  /**
   * Set a value in cache (async version)
   */
  public async setAsync<T>(prefix: CachePrefix, value: T, ...keyParts: (string | number | undefined)[]): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const key = this.generateKey(prefix, ...keyParts);
    const ttl = this.getTTLForPrefix(prefix);
    return this.adapter.set(key, value, ttl);
  }

  /**
   * Delete a specific key from cache
   */
  public del(prefix: CachePrefix, ...keyParts: (string | number | undefined)[]): number {
    const key = this.generateKey(prefix, ...keyParts);

    // Synchronous wrapper
    const adapter = this.adapter as any;
    if (adapter.cache && typeof adapter.cache.del === 'function') {
      const prefixedKey = adapter.prefixKey ? adapter.prefixKey(key) : key;
      return adapter.cache.del(prefixedKey);
    }

    // For async adapters, fire and forget (but log errors for debugging)
    this.adapter.del(key).catch(error => {
      console.warn(`[TrelloCacheManager] Async del failed for key '${key}':`, error);
    });
    return 1;
  }

  /**
   * Delete a specific key from cache (async version)
   */
  public async delAsync(prefix: CachePrefix, ...keyParts: (string | number | undefined)[]): Promise<number> {
    const key = this.generateKey(prefix, ...keyParts);
    return this.adapter.del(key);
  }

  /**
   * Invalidate all keys matching a prefix pattern
   */
  public invalidateByPrefix(prefix: CachePrefix, ...partialKeyParts: (string | number | undefined)[]): number {
    const pattern = this.generateKey(prefix, ...partialKeyParts) + '*';

    // Synchronous wrapper
    const adapter = this.adapter as any;
    if (adapter.cache && typeof adapter.cache.keys === 'function') {
      const prefixedPattern = adapter.prefixKey ? adapter.prefixKey(pattern.replace('*', '')) : pattern.replace('*', '');
      const keys = adapter.cache.keys();
      let deletedCount = 0;
      for (const key of keys) {
        if (key.startsWith(prefixedPattern)) {
          adapter.cache.del(key);
          deletedCount++;
        }
      }
      return deletedCount;
    }

    // For async adapters, fire and forget (but log errors for debugging)
    this.adapter.deleteByPattern(pattern).catch(error => {
      console.warn(`[TrelloCacheManager] Async deleteByPattern failed for pattern '${pattern}':`, error);
    });
    return 0;
  }

  /**
   * Invalidate all keys matching a prefix pattern (async version)
   */
  public async invalidateByPrefixAsync(prefix: CachePrefix, ...partialKeyParts: (string | number | undefined)[]): Promise<number> {
    const pattern = this.generateKey(prefix, ...partialKeyParts) + '*';
    return this.adapter.deleteByPattern(pattern);
  }

  /**
   * Invalidate cache entries related to a card update
   */
  public invalidateCard(cardId: string, listId?: string, boardId?: string): void {
    // Invalidate specific card
    this.del(CachePrefix.CARD, cardId);
    this.del(CachePrefix.CARD_COMMENTS, cardId);
    this.del(CachePrefix.CARD_HISTORY, cardId);

    // Invalidate cards by list if we know the list
    if (listId) {
      this.del(CachePrefix.CARDS_BY_LIST, listId);
    }

    // Invalidate my cards (user's assigned cards)
    this.invalidateByPrefix(CachePrefix.MY_CARDS);

    // Invalidate checklists for this card
    this.invalidateByPrefix(CachePrefix.CHECKLIST, cardId);
    this.invalidateByPrefix(CachePrefix.CHECKLIST_ITEMS, cardId);

    // Invalidate recent activity if we know the board
    if (boardId) {
      this.del(CachePrefix.RECENT_ACTIVITY, boardId);
    }
  }

  /**
   * Invalidate cache entries related to a card update (async version)
   */
  public async invalidateCardAsync(cardId: string, listId?: string, boardId?: string): Promise<void> {
    // Invalidate specific card
    await Promise.all([
      this.delAsync(CachePrefix.CARD, cardId),
      this.delAsync(CachePrefix.CARD_COMMENTS, cardId),
      this.delAsync(CachePrefix.CARD_HISTORY, cardId),
    ]);

    // Invalidate cards by list if we know the list
    if (listId) {
      await this.delAsync(CachePrefix.CARDS_BY_LIST, listId);
    }

    // Invalidate my cards (user's assigned cards)
    await this.invalidateByPrefixAsync(CachePrefix.MY_CARDS);

    // Invalidate checklists for this card
    await Promise.all([
      this.invalidateByPrefixAsync(CachePrefix.CHECKLIST, cardId),
      this.invalidateByPrefixAsync(CachePrefix.CHECKLIST_ITEMS, cardId),
    ]);

    // Invalidate recent activity if we know the board
    if (boardId) {
      await this.delAsync(CachePrefix.RECENT_ACTIVITY, boardId);
    }
  }

  /**
   * Invalidate cache entries related to a list change
   */
  public invalidateList(boardId: string): void {
    this.del(CachePrefix.LISTS, boardId);
    // Also invalidate recent activity
    this.del(CachePrefix.RECENT_ACTIVITY, boardId);
  }

  /**
   * Invalidate cache entries related to a list change (async version)
   */
  public async invalidateListAsync(boardId: string): Promise<void> {
    await Promise.all([
      this.delAsync(CachePrefix.LISTS, boardId),
      this.delAsync(CachePrefix.RECENT_ACTIVITY, boardId),
    ]);
  }

  /**
   * Invalidate cache entries related to board metadata changes
   */
  public invalidateBoard(boardId: string): void {
    this.del(CachePrefix.BOARD, boardId);
    this.invalidateByPrefix(CachePrefix.BOARDS);
    // Invalidate related lists
    this.del(CachePrefix.LISTS, boardId);
  }

  /**
   * Invalidate cache entries related to board metadata changes (async version)
   */
  public async invalidateBoardAsync(boardId: string): Promise<void> {
    await Promise.all([
      this.delAsync(CachePrefix.BOARD, boardId),
      this.invalidateByPrefixAsync(CachePrefix.BOARDS),
      this.delAsync(CachePrefix.LISTS, boardId),
    ]);
  }

  /**
   * Invalidate cache entries related to label changes
   */
  public invalidateLabels(boardId: string): void {
    this.del(CachePrefix.BOARD_LABELS, boardId);
  }

  /**
   * Invalidate cache entries related to label changes (async version)
   */
  public async invalidateLabelsAsync(boardId: string): Promise<void> {
    await this.delAsync(CachePrefix.BOARD_LABELS, boardId);
  }

  /**
   * Invalidate cache entries related to member changes
   */
  public invalidateMembers(boardId: string): void {
    this.del(CachePrefix.BOARD_MEMBERS, boardId);
  }

  /**
   * Invalidate cache entries related to member changes (async version)
   */
  public async invalidateMembersAsync(boardId: string): Promise<void> {
    await this.delAsync(CachePrefix.BOARD_MEMBERS, boardId);
  }

  /**
   * Invalidate cache entries related to checklist changes
   */
  public invalidateChecklist(cardId: string, checklistName?: string): void {
    this.del(CachePrefix.CARD, cardId);
    if (checklistName) {
      this.del(CachePrefix.CHECKLIST, cardId, checklistName);
      this.del(CachePrefix.CHECKLIST_ITEMS, cardId, checklistName);
    } else {
      this.invalidateByPrefix(CachePrefix.CHECKLIST, cardId);
      this.invalidateByPrefix(CachePrefix.CHECKLIST_ITEMS, cardId);
    }
  }

  /**
   * Invalidate cache entries related to checklist changes (async version)
   */
  public async invalidateChecklistAsync(cardId: string, checklistName?: string): Promise<void> {
    await this.delAsync(CachePrefix.CARD, cardId);
    if (checklistName) {
      await Promise.all([
        this.delAsync(CachePrefix.CHECKLIST, cardId, checklistName),
        this.delAsync(CachePrefix.CHECKLIST_ITEMS, cardId, checklistName),
      ]);
    } else {
      await Promise.all([
        this.invalidateByPrefixAsync(CachePrefix.CHECKLIST, cardId),
        this.invalidateByPrefixAsync(CachePrefix.CHECKLIST_ITEMS, cardId),
      ]);
    }
  }

  /**
   * Flush all caches
   */
  public flushAll(): void {
    this.adapter.flushAll().catch(() => {});
  }

  /**
   * Flush all caches (async version)
   */
  public async flushAllAsync(): Promise<void> {
    await this.adapter.flushAll();
  }

  /**
   * Get cache statistics (sync - may not reflect real-time for external stores)
   */
  public getStats(): CacheStats {
    const adapterStats = this.adapter.getStats();
    const totalRequests = adapterStats.hits + adapterStats.misses;
    return {
      hits: adapterStats.hits,
      misses: adapterStats.misses,
      keys: adapterStats.keys,
      hitRate: totalRequests > 0 ? adapterStats.hits / totalRequests : 0,
      storeType: this.storeType,
      connected: adapterStats.connected,
    };
  }

  /**
   * Get cache statistics (async - fetches real-time stats from external stores like Valkey)
   */
  public async getStatsAsync(): Promise<CacheStats> {
    const adapterStats = await this.adapter.getStatsAsync();
    const totalRequests = adapterStats.hits + adapterStats.misses;
    return {
      hits: adapterStats.hits,
      misses: adapterStats.misses,
      keys: adapterStats.keys,
      hitRate: totalRequests > 0 ? adapterStats.hits / totalRequests : 0,
      storeType: this.storeType,
      connected: adapterStats.connected,
    };
  }

  /**
   * Check if caching is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current TTL configuration
   */
  public getTTLConfig(): CacheTTLConfig {
    return { ...this.ttlConfig };
  }

  /**
   * Get the underlying adapter (for testing)
   */
  public getAdapter(): ICacheAdapter {
    return this.adapter;
  }

  /**
   * Disconnect from cache backend
   */
  public async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }
}

// Singleton instance for the cache manager
let cacheManagerInstance: TrelloCacheManager | null = null;

/**
 * Get the singleton cache manager instance
 */
export function getCacheManager(): TrelloCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new TrelloCacheManager();
  }
  return cacheManagerInstance;
}

/**
 * Initialize the cache manager with async adapter (for Valkey support)
 */
export async function initializeCacheManager(): Promise<TrelloCacheManager> {
  const manager = getCacheManager();
  await manager.initialize();
  return manager;
}

/**
 * Reset the cache manager instance (mainly for testing)
 */
export function resetCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.flushAll();
    cacheManagerInstance = null;
  }
}
