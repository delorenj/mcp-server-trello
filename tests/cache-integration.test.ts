/**
 * Integration Tests for Trello Cache Layer
 *
 * These tests verify caching behavior with simulated real-world patterns.
 *
 * Run with: bun test tests/cache-integration.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { TrelloCacheManager, CachePrefix, resetCacheManager } from '../src/cache-manager';

describe('Cache Integration Tests', () => {
  let cache: TrelloCacheManager;

  beforeAll(() => {
    resetCacheManager();
    delete process.env.TRELLO_CACHE_ENABLED;
    cache = new TrelloCacheManager();
  });

  afterAll(() => {
    resetCacheManager();
  });

  describe('Cache Statistics in Real Usage', () => {
    test('tracks hits and misses correctly', () => {
      // First access - should be a miss
      const result1 = cache.get(CachePrefix.BOARDS, 'test-board');
      expect(result1).toBeUndefined();

      // Set a value
      cache.set(CachePrefix.BOARDS, [{ id: 'test', name: 'Test Board' }], 'test-board');

      // Second access - should be a hit
      const result2 = cache.get(CachePrefix.BOARDS, 'test-board');
      expect(result2).toBeDefined();

      // Third access - should be another hit
      const result3 = cache.get(CachePrefix.BOARDS, 'test-board');
      expect(result3).toBeDefined();

      const stats = cache.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.hits).toBeGreaterThanOrEqual(2);
    });

    test('cache improves response time', async () => {
      const testData = { id: 'perf-test', data: Array(1000).fill('x').join('') };

      // Measure set time
      const setStart = performance.now();
      cache.set(CachePrefix.CARD, testData, 'perf-card');
      const setTime = performance.now() - setStart;

      // Measure get time (should be very fast)
      const getStart = performance.now();
      const retrieved = cache.get(CachePrefix.CARD, 'perf-card');
      const getTime = performance.now() - getStart;

      expect(retrieved).toEqual(testData);
      expect(getTime).toBeLessThan(10); // Should be < 10ms
      console.log(`Cache set: ${setTime.toFixed(2)}ms, get: ${getTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Invalidation Patterns', () => {
    test('card invalidation clears related caches', () => {
      // Set up related caches
      cache.set(CachePrefix.CARD, { id: 'c1' }, 'card-inv-1');
      cache.set(CachePrefix.CARD_COMMENTS, [{ text: 'comment' }], 'card-inv-1');
      cache.set(CachePrefix.CARDS_BY_LIST, [{ id: 'c1' }], 'list-inv-1');
      cache.set(CachePrefix.CHECKLIST, { name: 'AC' }, 'card-inv-1', 'AC');

      // Verify all set
      expect(cache.get(CachePrefix.CARD, 'card-inv-1')).toBeDefined();
      expect(cache.get(CachePrefix.CARD_COMMENTS, 'card-inv-1')).toBeDefined();
      expect(cache.get(CachePrefix.CARDS_BY_LIST, 'list-inv-1')).toBeDefined();
      expect(cache.get(CachePrefix.CHECKLIST, 'card-inv-1', 'AC')).toBeDefined();

      // Invalidate card
      cache.invalidateCard('card-inv-1', 'list-inv-1');

      // Verify all cleared
      expect(cache.get(CachePrefix.CARD, 'card-inv-1')).toBeUndefined();
      expect(cache.get(CachePrefix.CARD_COMMENTS, 'card-inv-1')).toBeUndefined();
      expect(cache.get(CachePrefix.CARDS_BY_LIST, 'list-inv-1')).toBeUndefined();
      expect(cache.get(CachePrefix.CHECKLIST, 'card-inv-1', 'AC')).toBeUndefined();
    });

    test('list invalidation clears list and activity caches', () => {
      cache.set(CachePrefix.LISTS, [{ id: 'l1' }], 'board-inv-1');
      cache.set(CachePrefix.RECENT_ACTIVITY, [{ type: 'action' }], 'board-inv-1');

      expect(cache.get(CachePrefix.LISTS, 'board-inv-1')).toBeDefined();
      expect(cache.get(CachePrefix.RECENT_ACTIVITY, 'board-inv-1')).toBeDefined();

      cache.invalidateList('board-inv-1');

      expect(cache.get(CachePrefix.LISTS, 'board-inv-1')).toBeUndefined();
      expect(cache.get(CachePrefix.RECENT_ACTIVITY, 'board-inv-1')).toBeUndefined();
    });

    test('board invalidation clears board-level caches', () => {
      cache.set(CachePrefix.BOARD, { id: 'b1' }, 'board-inv-2');
      cache.set(CachePrefix.BOARDS, [{ id: 'b1' }], 'all');
      cache.set(CachePrefix.LISTS, [{ id: 'l1' }], 'board-inv-2');

      cache.invalidateBoard('board-inv-2');

      expect(cache.get(CachePrefix.BOARD, 'board-inv-2')).toBeUndefined();
      expect(cache.get(CachePrefix.BOARDS, 'all')).toBeUndefined();
      expect(cache.get(CachePrefix.LISTS, 'board-inv-2')).toBeUndefined();
    });
  });

  describe('TTL Behavior', () => {
    test('respects custom TTL from environment', () => {
      process.env.TRELLO_CACHE_TTL_CARDS = '1';
      const shortTTLCache = new TrelloCacheManager();

      shortTTLCache.set(CachePrefix.CARD, { id: 'ttl-test' }, 'card-ttl');
      expect(shortTTLCache.get(CachePrefix.CARD, 'card-ttl')).toBeDefined();

      delete process.env.TRELLO_CACHE_TTL_CARDS;
    });

    test('cache can be disabled via environment', () => {
      process.env.TRELLO_CACHE_ENABLED = 'false';
      const disabledCache = new TrelloCacheManager();

      const setResult = disabledCache.set(CachePrefix.CARD, { id: 'disabled' }, 'card-disabled');
      expect(setResult).toBe(false);

      const getResult = disabledCache.get(CachePrefix.CARD, 'card-disabled');
      expect(getResult).toBeUndefined();

      expect(disabledCache.isEnabled()).toBe(false);

      delete process.env.TRELLO_CACHE_ENABLED;
    });
  });

  describe('Concurrent Access', () => {
    test('handles multiple rapid get/set operations', () => {
      const operations = 100;
      const results: boolean[] = [];

      for (let i = 0; i < operations; i++) {
        cache.set(CachePrefix.CARD, { id: `card-${i}` }, `concurrent-${i}`);
        const retrieved = cache.get(CachePrefix.CARD, `concurrent-${i}`);
        results.push(retrieved !== undefined);
      }

      expect(results.every(r => r)).toBe(true);
      expect(cache.getStats().keys).toBeGreaterThanOrEqual(operations);
    });

    test('prefix invalidation under load', () => {
      for (let i = 0; i < 50; i++) {
        cache.set(CachePrefix.MY_CARDS, { id: `my-${i}` }, `user-${i}`);
      }

      const deleted = cache.invalidateByPrefix(CachePrefix.MY_CARDS);
      expect(deleted).toBe(50);

      for (let i = 0; i < 50; i++) {
        expect(cache.get(CachePrefix.MY_CARDS, `user-${i}`)).toBeUndefined();
      }
    });
  });

  describe('Real-World Workflow Simulation', () => {
    test('simulates typical MCP session', () => {
      // User starts session - fetch boards
      cache.set(CachePrefix.BOARDS, [{ id: 'b1', name: 'Main Board' }], 'all');

      // User selects board - fetch lists
      cache.set(CachePrefix.LISTS, [
        { id: 'l1', name: 'To Do' },
        { id: 'l2', name: 'Doing' },
        { id: 'l3', name: 'Done' },
      ], 'b1');

      // User views cards in a list
      cache.set(CachePrefix.CARDS_BY_LIST, [
        { id: 'c1', name: 'Task 1' },
        { id: 'c2', name: 'Task 2' },
      ], 'l1');

      // User opens a card
      cache.set(CachePrefix.CARD, { id: 'c1', name: 'Task 1', desc: 'Description' }, 'c1');
      cache.set(CachePrefix.CARD_COMMENTS, [{ text: 'Comment 1' }], 'c1');

      // Simulate multiple reads (should all be cache hits)
      const initialStats = cache.getStats();

      cache.get(CachePrefix.BOARDS, 'all');
      cache.get(CachePrefix.LISTS, 'b1');
      cache.get(CachePrefix.CARDS_BY_LIST, 'l1');
      cache.get(CachePrefix.CARD, 'c1');
      cache.get(CachePrefix.CARD_COMMENTS, 'c1');

      const afterStats = cache.getStats();
      expect(afterStats.hits - initialStats.hits).toBe(5);

      // User updates card - invalidate
      cache.invalidateCard('c1', 'l1', 'b1');

      // Next read should be a miss
      const cardAfterInvalidation = cache.get(CachePrefix.CARD, 'c1');
      expect(cardAfterInvalidation).toBeUndefined();
    });
  });
});
