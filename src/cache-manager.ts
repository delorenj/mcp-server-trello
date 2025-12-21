import NodeCache from 'node-cache';

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
}

/**
 * TrelloCacheManager - Intelligent caching layer for Trello API calls
 *
 * Features:
 * - Separate cache instances for different TTLs
 * - Configurable via environment variables
 * - Write-through invalidation
 * - Cache statistics for monitoring
 */
export class TrelloCacheManager {
  private longCache: NodeCache;    // boards, labels, members, workspaces
  private mediumCache: NodeCache;  // lists
  private shortCache: NodeCache;   // cards, checklists, activities

  private stats = {
    hits: 0,
    misses: 0,
  };

  private enabled: boolean;
  private ttlConfig: CacheTTLConfig;

  constructor() {
    this.ttlConfig = this.loadTTLConfig();
    this.enabled = this.isCacheEnabled();

    // Long-lived cache for stable data
    this.longCache = new NodeCache({
      stdTTL: this.ttlConfig.boards,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: true,
    });

    // Medium-lived cache for lists
    this.mediumCache = new NodeCache({
      stdTTL: this.ttlConfig.lists,
      checkperiod: 120, // Check every 2 minutes
      useClones: true,
    });

    // Short-lived cache for volatile data
    this.shortCache = new NodeCache({
      stdTTL: this.ttlConfig.cards,
      checkperiod: 30, // Check every 30 seconds
      useClones: true,
    });
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
   * Check if caching is enabled via environment variable
   */
  private isCacheEnabled(): boolean {
    const envValue = process.env.TRELLO_CACHE_ENABLED;
    // Default to enabled, can be disabled with "false" or "0"
    if (envValue === 'false' || envValue === '0') {
      return false;
    }
    return true;
  }

  /**
   * Parse integer from environment variable with fallback
   */
  private parseEnvInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
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
   * Get the appropriate cache instance for a prefix
   */
  private getCacheForPrefix(prefix: CachePrefix): NodeCache {
    switch (prefix) {
      // Long-lived data
      case CachePrefix.BOARDS:
      case CachePrefix.BOARD:
      case CachePrefix.WORKSPACES:
      case CachePrefix.WORKSPACE:
      case CachePrefix.BOARDS_IN_WORKSPACE:
      case CachePrefix.BOARD_LABELS:
      case CachePrefix.BOARD_MEMBERS:
        return this.longCache;

      // Medium-lived data
      case CachePrefix.LISTS:
        return this.mediumCache;

      // Short-lived data
      case CachePrefix.CARDS_BY_LIST:
      case CachePrefix.CARD:
      case CachePrefix.MY_CARDS:
      case CachePrefix.CARD_COMMENTS:
      case CachePrefix.CARD_HISTORY:
      case CachePrefix.CHECKLIST:
      case CachePrefix.CHECKLIST_ITEMS:
      case CachePrefix.RECENT_ACTIVITY:
        return this.shortCache;

      default:
        return this.shortCache;
    }
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
    const cache = this.getCacheForPrefix(prefix);
    const value = cache.get<T>(key);

    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    return value;
  }

  /**
   * Set a value in cache
   */
  public set<T>(prefix: CachePrefix, value: T, ...keyParts: (string | number | undefined)[]): boolean {
    if (!this.enabled) {
      return false;
    }

    const key = this.generateKey(prefix, ...keyParts);
    const cache = this.getCacheForPrefix(prefix);
    const ttl = this.getTTLForPrefix(prefix);

    return cache.set(key, value, ttl);
  }

  /**
   * Delete a specific key from cache
   */
  public del(prefix: CachePrefix, ...keyParts: (string | number | undefined)[]): number {
    const key = this.generateKey(prefix, ...keyParts);
    const cache = this.getCacheForPrefix(prefix);
    return cache.del(key);
  }

  /**
   * Invalidate all keys matching a prefix pattern
   */
  public invalidateByPrefix(prefix: CachePrefix, ...partialKeyParts: (string | number | undefined)[]): number {
    const cache = this.getCacheForPrefix(prefix);
    const pattern = this.generateKey(prefix, ...partialKeyParts);
    const keys = cache.keys();

    let deletedCount = 0;
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        cache.del(key);
        deletedCount++;
      }
    }

    return deletedCount;
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
   * Invalidate cache entries related to a list change
   */
  public invalidateList(boardId: string): void {
    this.del(CachePrefix.LISTS, boardId);
    // Also invalidate recent activity
    this.del(CachePrefix.RECENT_ACTIVITY, boardId);
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
   * Invalidate cache entries related to label changes
   */
  public invalidateLabels(boardId: string): void {
    this.del(CachePrefix.BOARD_LABELS, boardId);
  }

  /**
   * Invalidate cache entries related to member changes
   */
  public invalidateMembers(boardId: string): void {
    this.del(CachePrefix.BOARD_MEMBERS, boardId);
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
   * Flush all caches
   */
  public flushAll(): void {
    this.longCache.flushAll();
    this.mediumCache.flushAll();
    this.shortCache.flushAll();
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.longCache.keys().length + this.mediumCache.keys().length + this.shortCache.keys().length,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
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
 * Reset the cache manager instance (mainly for testing)
 */
export function resetCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.flushAll();
    cacheManagerInstance = null;
  }
}
