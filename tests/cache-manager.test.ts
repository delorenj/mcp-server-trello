import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  TrelloCacheManager,
  CachePrefix,
  getCacheManager,
  resetCacheManager,
  type CacheTTLConfig,
  type CacheStats,
} from '../src/cache-manager';

describe('TrelloCacheManager', () => {
  let cache: TrelloCacheManager;

  beforeEach(() => {
    // Reset singleton and environment before each test
    resetCacheManager();
    delete process.env.TRELLO_CACHE_ENABLED;
    delete process.env.TRELLO_CACHE_TTL_BOARDS;
    delete process.env.TRELLO_CACHE_TTL_LISTS;
    delete process.env.TRELLO_CACHE_TTL_LABELS;
    delete process.env.TRELLO_CACHE_TTL_MEMBERS;
    delete process.env.TRELLO_CACHE_TTL_CARDS;
    delete process.env.TRELLO_CACHE_TTL_ACTIVITIES;
    cache = new TrelloCacheManager();
  });

  afterEach(() => {
    resetCacheManager();
  });

  describe('Key Generation', () => {
    test('generates key with single part', () => {
      const key = cache.generateKey(CachePrefix.BOARDS, 'abc123');
      expect(key).toBe('boards:abc123');
    });

    test('generates key with multiple parts', () => {
      const key = cache.generateKey(CachePrefix.CARDS_BY_LIST, 'board1', 'list1');
      expect(key).toBe('cards_by_list:board1:list1');
    });

    test('filters out undefined and null parts', () => {
      const key = cache.generateKey(CachePrefix.CARD, 'card1', undefined, 'extra');
      expect(key).toBe('card:card1:extra');
    });

    test('handles numeric parts', () => {
      const key = cache.generateKey(CachePrefix.RECENT_ACTIVITY, 'board1', 10);
      expect(key).toBe('recent_activity:board1:10');
    });

    test('handles empty parts array', () => {
      const key = cache.generateKey(CachePrefix.BOARDS);
      expect(key).toBe('boards:');
    });
  });

  describe('Get/Set Operations', () => {
    test('stores and retrieves a value', () => {
      const testData = { id: '123', name: 'Test Board' };
      cache.set(CachePrefix.BOARD, testData, 'board123');

      const retrieved = cache.get<typeof testData>(CachePrefix.BOARD, 'board123');
      expect(retrieved).toEqual(testData);
    });

    test('returns undefined for non-existent key', () => {
      const result = cache.get(CachePrefix.BOARD, 'nonexistent');
      expect(result).toBeUndefined();
    });

    test('stores array values', () => {
      const testData = [{ id: '1' }, { id: '2' }, { id: '3' }];
      cache.set(CachePrefix.LISTS, testData, 'board1');

      const retrieved = cache.get<typeof testData>(CachePrefix.LISTS, 'board1');
      expect(retrieved).toEqual(testData);
    });

    test('returns cloned data (not reference)', () => {
      const testData = { id: '123', name: 'Test' };
      cache.set(CachePrefix.CARD, testData, 'card1');

      const retrieved = cache.get<typeof testData>(CachePrefix.CARD, 'card1');
      expect(retrieved).not.toBe(testData); // Different object reference
      expect(retrieved).toEqual(testData);  // Same content
    });
  });

  describe('Delete Operations', () => {
    test('deletes a specific key', () => {
      cache.set(CachePrefix.CARD, { id: '1' }, 'card1');
      cache.set(CachePrefix.CARD, { id: '2' }, 'card2');

      const deleted = cache.del(CachePrefix.CARD, 'card1');
      expect(deleted).toBe(1);
      expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
      expect(cache.get(CachePrefix.CARD, 'card2')).toBeDefined();
    });

    test('returns 0 when key does not exist', () => {
      const deleted = cache.del(CachePrefix.CARD, 'nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('Prefix Invalidation', () => {
    test('invalidates all keys with matching prefix', () => {
      cache.set(CachePrefix.CARD, { id: '1' }, 'card1');
      cache.set(CachePrefix.CARD, { id: '2' }, 'card2');
      cache.set(CachePrefix.CARD, { id: '3' }, 'card3');
      cache.set(CachePrefix.LISTS, [{ id: 'list1' }], 'board1');

      const deleted = cache.invalidateByPrefix(CachePrefix.CARD);
      expect(deleted).toBe(3);
      expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
      expect(cache.get(CachePrefix.CARD, 'card2')).toBeUndefined();
      expect(cache.get(CachePrefix.CARD, 'card3')).toBeUndefined();
      // Lists should remain
      expect(cache.get(CachePrefix.LISTS, 'board1')).toBeDefined();
    });

    test('invalidates keys with partial match', () => {
      cache.set(CachePrefix.CHECKLIST, { name: 'AC' }, 'card1', 'checklist1');
      cache.set(CachePrefix.CHECKLIST, { name: 'Tasks' }, 'card1', 'checklist2');
      cache.set(CachePrefix.CHECKLIST, { name: 'Other' }, 'card2', 'checklist1');

      // Only invalidate checklists for card1
      const deleted = cache.invalidateByPrefix(CachePrefix.CHECKLIST, 'card1');
      expect(deleted).toBe(2);
      expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'checklist1')).toBeUndefined();
      expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'checklist2')).toBeUndefined();
      // card2's checklist should remain
      expect(cache.get(CachePrefix.CHECKLIST, 'card2', 'checklist1')).toBeDefined();
    });
  });

  describe('Cache Statistics', () => {
    test('tracks hits correctly', () => {
      cache.set(CachePrefix.BOARD, { id: '1' }, 'board1');
      cache.get(CachePrefix.BOARD, 'board1');
      cache.get(CachePrefix.BOARD, 'board1');
      cache.get(CachePrefix.BOARD, 'board1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    test('tracks misses correctly', () => {
      cache.get(CachePrefix.BOARD, 'nonexistent1');
      cache.get(CachePrefix.BOARD, 'nonexistent2');

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    test('calculates hit rate correctly', () => {
      cache.set(CachePrefix.BOARD, { id: '1' }, 'board1');
      // 3 hits
      cache.get(CachePrefix.BOARD, 'board1');
      cache.get(CachePrefix.BOARD, 'board1');
      cache.get(CachePrefix.BOARD, 'board1');
      // 1 miss
      cache.get(CachePrefix.BOARD, 'nonexistent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.75); // 3/4
    });

    test('counts total keys across all caches', () => {
      cache.set(CachePrefix.BOARDS, [], 'all'); // long cache
      cache.set(CachePrefix.BOARD, { id: '1' }, 'board1'); // long cache
      cache.set(CachePrefix.LISTS, [], 'board1'); // medium cache
      cache.set(CachePrefix.CARD, { id: '1' }, 'card1'); // short cache

      const stats = cache.getStats();
      expect(stats.keys).toBe(4);
    });

    test('returns 0 hit rate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Disabled', () => {
    test('returns undefined on get when disabled', () => {
      process.env.TRELLO_CACHE_ENABLED = 'false';
      const disabledCache = new TrelloCacheManager();

      disabledCache.set(CachePrefix.BOARD, { id: '1' }, 'board1');
      const result = disabledCache.get(CachePrefix.BOARD, 'board1');
      expect(result).toBeUndefined();
    });

    test('returns false on set when disabled', () => {
      process.env.TRELLO_CACHE_ENABLED = '0';
      const disabledCache = new TrelloCacheManager();

      const result = disabledCache.set(CachePrefix.BOARD, { id: '1' }, 'board1');
      expect(result).toBe(false);
    });

    test('isEnabled returns false when disabled', () => {
      process.env.TRELLO_CACHE_ENABLED = 'false';
      const disabledCache = new TrelloCacheManager();
      expect(disabledCache.isEnabled()).toBe(false);
    });

    test('isEnabled returns true by default', () => {
      expect(cache.isEnabled()).toBe(true);
    });
  });

  describe('TTL Configuration', () => {
    test('uses default TTL values', () => {
      const config = cache.getTTLConfig();
      expect(config.boards).toBe(6 * 60 * 60); // 6 hours
      expect(config.lists).toBe(60 * 60); // 1 hour
      expect(config.labels).toBe(6 * 60 * 60); // 6 hours
      expect(config.members).toBe(12 * 60 * 60); // 12 hours
      expect(config.cards).toBe(2 * 60); // 2 minutes
      expect(config.activities).toBe(60); // 1 minute
    });

    test('loads custom TTL from environment', () => {
      process.env.TRELLO_CACHE_TTL_BOARDS = '3600';
      process.env.TRELLO_CACHE_TTL_CARDS = '30';
      const customCache = new TrelloCacheManager();

      const config = customCache.getTTLConfig();
      expect(config.boards).toBe(3600);
      expect(config.cards).toBe(30);
      // Others should remain default
      expect(config.lists).toBe(60 * 60);
    });

    test('ignores invalid TTL values (non-numeric and negative)', () => {
      process.env.TRELLO_CACHE_TTL_BOARDS = 'invalid';
      process.env.TRELLO_CACHE_TTL_CARDS = '-100';
      process.env.TRELLO_CACHE_TTL_LISTS = '-1';
      const customCache = new TrelloCacheManager();

      const config = customCache.getTTLConfig();
      expect(config.boards).toBe(6 * 60 * 60); // Default (non-numeric ignored)
      expect(config.cards).toBe(2 * 60); // Default (negative ignored)
      expect(config.lists).toBe(60 * 60); // Default (negative ignored)
    });

    test('accepts TTL=0 as valid (disables caching for that resource)', () => {
      process.env.TRELLO_CACHE_TTL_ACTIVITIES = '0';
      const customCache = new TrelloCacheManager();

      const config = customCache.getTTLConfig();
      expect(config.activities).toBe(0); // Zero is valid
    });

    test('returns a copy of TTL config (immutable)', () => {
      const config1 = cache.getTTLConfig();
      config1.boards = 999;
      const config2 = cache.getTTLConfig();
      expect(config2.boards).not.toBe(999);
    });
  });

  describe('Cache Prefix Routing', () => {
    test('routes board-related prefixes to long cache', () => {
      const boardPrefixes = [
        CachePrefix.BOARDS,
        CachePrefix.BOARD,
        CachePrefix.WORKSPACES,
        CachePrefix.WORKSPACE,
        CachePrefix.BOARDS_IN_WORKSPACE,
        CachePrefix.BOARD_LABELS,
        CachePrefix.BOARD_MEMBERS,
      ];

      for (const prefix of boardPrefixes) {
        cache.set(prefix, { test: true }, 'id1');
        expect(cache.get(prefix, 'id1')).toBeDefined();
      }
    });

    test('routes lists to medium cache', () => {
      cache.set(CachePrefix.LISTS, [{ id: 'list1' }], 'board1');
      expect(cache.get(CachePrefix.LISTS, 'board1')).toBeDefined();
    });

    test('routes volatile data to short cache', () => {
      const shortPrefixes = [
        CachePrefix.CARDS_BY_LIST,
        CachePrefix.CARD,
        CachePrefix.MY_CARDS,
        CachePrefix.CARD_COMMENTS,
        CachePrefix.CARD_HISTORY,
        CachePrefix.CHECKLIST,
        CachePrefix.CHECKLIST_ITEMS,
        CachePrefix.RECENT_ACTIVITY,
      ];

      for (const prefix of shortPrefixes) {
        cache.set(prefix, { test: true }, 'id1');
        expect(cache.get(prefix, 'id1')).toBeDefined();
      }
    });
  });

  describe('Invalidation Helpers', () => {
    describe('invalidateCard', () => {
      test('invalidates card and related caches', () => {
        cache.set(CachePrefix.CARD, { id: 'c1' }, 'card1');
        cache.set(CachePrefix.CARD_COMMENTS, [], 'card1');
        cache.set(CachePrefix.CARD_HISTORY, [], 'card1');
        cache.set(CachePrefix.CARDS_BY_LIST, [], 'list1');
        cache.set(CachePrefix.MY_CARDS, [], 'user1');
        cache.set(CachePrefix.CHECKLIST, {}, 'card1', 'AC');
        cache.set(CachePrefix.RECENT_ACTIVITY, [], 'board1');

        cache.invalidateCard('card1', 'list1', 'board1');

        expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
        expect(cache.get(CachePrefix.CARD_COMMENTS, 'card1')).toBeUndefined();
        expect(cache.get(CachePrefix.CARD_HISTORY, 'card1')).toBeUndefined();
        expect(cache.get(CachePrefix.CARDS_BY_LIST, 'list1')).toBeUndefined();
        expect(cache.get(CachePrefix.MY_CARDS, 'user1')).toBeUndefined();
        expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'AC')).toBeUndefined();
        expect(cache.get(CachePrefix.RECENT_ACTIVITY, 'board1')).toBeUndefined();
      });

      test('works with minimal parameters', () => {
        cache.set(CachePrefix.CARD, { id: 'c1' }, 'card1');
        cache.invalidateCard('card1');
        expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
      });
    });

    describe('invalidateList', () => {
      test('invalidates lists and activity for board', () => {
        cache.set(CachePrefix.LISTS, [], 'board1');
        cache.set(CachePrefix.RECENT_ACTIVITY, [], 'board1');

        cache.invalidateList('board1');

        expect(cache.get(CachePrefix.LISTS, 'board1')).toBeUndefined();
        expect(cache.get(CachePrefix.RECENT_ACTIVITY, 'board1')).toBeUndefined();
      });
    });

    describe('invalidateBoard', () => {
      test('invalidates board and related caches', () => {
        cache.set(CachePrefix.BOARD, { id: 'b1' }, 'board1');
        cache.set(CachePrefix.BOARDS, [], 'all');
        cache.set(CachePrefix.LISTS, [], 'board1');

        cache.invalidateBoard('board1');

        expect(cache.get(CachePrefix.BOARD, 'board1')).toBeUndefined();
        expect(cache.get(CachePrefix.BOARDS, 'all')).toBeUndefined();
        expect(cache.get(CachePrefix.LISTS, 'board1')).toBeUndefined();
      });
    });

    describe('invalidateLabels', () => {
      test('invalidates labels for board', () => {
        cache.set(CachePrefix.BOARD_LABELS, [], 'board1');
        cache.invalidateLabels('board1');
        expect(cache.get(CachePrefix.BOARD_LABELS, 'board1')).toBeUndefined();
      });
    });

    describe('invalidateMembers', () => {
      test('invalidates members for board', () => {
        cache.set(CachePrefix.BOARD_MEMBERS, [], 'board1');
        cache.invalidateMembers('board1');
        expect(cache.get(CachePrefix.BOARD_MEMBERS, 'board1')).toBeUndefined();
      });
    });

    describe('invalidateChecklist', () => {
      test('invalidates specific checklist', () => {
        cache.set(CachePrefix.CARD, { id: 'c1' }, 'card1');
        cache.set(CachePrefix.CHECKLIST, {}, 'card1', 'AC');
        cache.set(CachePrefix.CHECKLIST_ITEMS, [], 'card1', 'AC');
        cache.set(CachePrefix.CHECKLIST, {}, 'card1', 'Tasks');

        cache.invalidateChecklist('card1', 'AC');

        expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
        expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'AC')).toBeUndefined();
        expect(cache.get(CachePrefix.CHECKLIST_ITEMS, 'card1', 'AC')).toBeUndefined();
        // Other checklists should remain
        expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'Tasks')).toBeDefined();
      });

      test('invalidates all checklists when name not provided', () => {
        cache.set(CachePrefix.CHECKLIST, {}, 'card1', 'AC');
        cache.set(CachePrefix.CHECKLIST, {}, 'card1', 'Tasks');

        cache.invalidateChecklist('card1');

        expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'AC')).toBeUndefined();
        expect(cache.get(CachePrefix.CHECKLIST, 'card1', 'Tasks')).toBeUndefined();
      });
    });
  });

  describe('Flush All', () => {
    test('clears all caches', () => {
      cache.set(CachePrefix.BOARDS, [], 'all');
      cache.set(CachePrefix.LISTS, [], 'board1');
      cache.set(CachePrefix.CARD, { id: 'c1' }, 'card1');

      cache.flushAll();

      expect(cache.get(CachePrefix.BOARDS, 'all')).toBeUndefined();
      expect(cache.get(CachePrefix.LISTS, 'board1')).toBeUndefined();
      expect(cache.get(CachePrefix.CARD, 'card1')).toBeUndefined();
      expect(cache.getStats().keys).toBe(0);
    });
  });
});

describe('Singleton Pattern', () => {
  beforeEach(() => {
    resetCacheManager();
    delete process.env.TRELLO_CACHE_ENABLED;
  });

  afterEach(() => {
    resetCacheManager();
  });

  test('getCacheManager returns same instance', () => {
    const instance1 = getCacheManager();
    const instance2 = getCacheManager();
    expect(instance1).toBe(instance2);
  });

  test('resetCacheManager clears singleton', () => {
    const instance1 = getCacheManager();
    instance1.set(CachePrefix.BOARD, { id: '1' }, 'board1');

    resetCacheManager();

    const instance2 = getCacheManager();
    expect(instance2).not.toBe(instance1);
    expect(instance2.get(CachePrefix.BOARD, 'board1')).toBeUndefined();
  });

  test('data persists across getCacheManager calls', () => {
    const instance1 = getCacheManager();
    instance1.set(CachePrefix.BOARD, { id: '1' }, 'board1');

    const instance2 = getCacheManager();
    expect(instance2.get(CachePrefix.BOARD, 'board1')).toEqual({ id: '1' });
  });
});
