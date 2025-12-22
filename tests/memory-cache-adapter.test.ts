import { describe, it, expect, beforeEach } from 'bun:test';
import { MemoryCacheAdapter } from '../src/cache/memory-cache-adapter.js';

/**
 * Tests for MemoryCacheAdapter
 *
 * The memory adapter is the default caching backend.
 * It uses node-cache for in-process caching.
 */

describe('MemoryCacheAdapter', () => {
  let adapter: MemoryCacheAdapter;

  beforeEach(async () => {
    adapter = new MemoryCacheAdapter({
      defaultTTL: 60,
      keyPrefix: 'test',
    });
    await adapter.flushAll();
  });

  describe('Basic Operations', () => {
    it('should be ready immediately', () => {
      expect(adapter.isReady()).toBe(true);
    });

    it('should connect without error', async () => {
      await expect(adapter.connect()).resolves.toBeUndefined();
    });

    it('should set and get a value', async () => {
      await adapter.set('key1', 'value1');
      const result = await adapter.get<string>('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent key', async () => {
      const result = await adapter.get<string>('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle complex objects', async () => {
      const data = {
        id: '123',
        name: 'Test Card',
        labels: ['urgent', 'bug'],
        nested: { checklist: ['item1', 'item2'] },
      };

      await adapter.set('complex', data);
      const result = await adapter.get<typeof data>('complex');
      expect(result).toEqual(data);
    });

    it('should delete a key', async () => {
      await adapter.set('to-delete', 'value');
      expect(await adapter.get('to-delete')).toBe('value');

      const deleted = await adapter.del('to-delete');
      expect(deleted).toBe(1);
      expect(await adapter.get('to-delete')).toBeUndefined();
    });

    it('should return 0 when deleting non-existent key', async () => {
      const deleted = await adapter.del('nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('Key Patterns', () => {
    beforeEach(async () => {
      await adapter.set('cards:list1:card1', 'data1');
      await adapter.set('cards:list1:card2', 'data2');
      await adapter.set('cards:list2:card1', 'data3');
      await adapter.set('boards:board1', 'board-data');
    });

    it('should delete keys by pattern', async () => {
      const deleted = await adapter.deleteByPattern('cards:list1:*');
      expect(deleted).toBe(2);

      expect(await adapter.get('cards:list1:card1')).toBeUndefined();
      expect(await adapter.get('cards:list1:card2')).toBeUndefined();
      expect(await adapter.get('cards:list2:card1')).toBe('data3');
    });

    it('should list all keys', async () => {
      const keys = await adapter.keys();
      expect(keys.length).toBe(4);
    });

    it('should list keys by pattern', async () => {
      const cardKeys = await adapter.keys('cards:*');
      expect(cardKeys.length).toBe(3);

      const list1Keys = await adapter.keys('cards:list1:*');
      expect(list1Keys.length).toBe(2);
    });

    it('should check if key exists', async () => {
      expect(await adapter.has('cards:list1:card1')).toBe(true);
      expect(await adapter.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL Handling', () => {
    it('should expire keys after TTL', async () => {
      // Create adapter with very short TTL
      const shortTTLAdapter = new MemoryCacheAdapter({
        defaultTTL: 1,
        keyPrefix: 'ttl-test',
      });

      await shortTTLAdapter.set('expiring', 'value');
      expect(await shortTTLAdapter.get('expiring')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(await shortTTLAdapter.get('expiring')).toBeUndefined();
    });

    it('should use custom TTL when provided', async () => {
      await adapter.set('custom-ttl', 'value', 1);
      expect(await adapter.get('custom-ttl')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 1500));
      expect(await adapter.get('custom-ttl')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      // Fresh adapter for clean stats
      const statsAdapter = new MemoryCacheAdapter({
        defaultTTL: 60,
        keyPrefix: 'stats-test',
      });

      await statsAdapter.set('hit-key', 'value');

      // Generate hits
      await statsAdapter.get('hit-key');
      await statsAdapter.get('hit-key');
      await statsAdapter.get('hit-key');

      // Generate misses
      await statsAdapter.get('miss1');
      await statsAdapter.get('miss2');

      const stats = statsAdapter.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.connected).toBe(true);
    });

    it('should count keys', async () => {
      const countAdapter = new MemoryCacheAdapter({
        defaultTTL: 60,
        keyPrefix: 'count-test',
      });

      await countAdapter.set('key1', 'value1');
      await countAdapter.set('key2', 'value2');
      await countAdapter.set('key3', 'value3');

      const stats = countAdapter.getStats();
      expect(stats.keys).toBe(3);
    });
  });

  describe('Flush Operations', () => {
    it('should flush all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.set('key3', 'value3');

      expect((await adapter.keys()).length).toBe(3);

      await adapter.flushAll();

      expect((await adapter.keys()).length).toBe(0);
    });

    it('should flush on disconnect', async () => {
      await adapter.set('key1', 'value1');
      await adapter.disconnect();

      expect(await adapter.get('key1')).toBeUndefined();
    });
  });

  describe('Key Prefixing', () => {
    it('should handle keys with prefix', async () => {
      const prefixedAdapter = new MemoryCacheAdapter({
        defaultTTL: 60,
        keyPrefix: 'my-prefix',
      });

      await prefixedAdapter.set('my-key', 'my-value');
      const result = await prefixedAdapter.get<string>('my-key');
      expect(result).toBe('my-value');

      // Keys should be returned without prefix
      const keys = await prefixedAdapter.keys();
      expect(keys).toContain('my-key');
    });

    it('should work without prefix', async () => {
      const noPrefixAdapter = new MemoryCacheAdapter({
        defaultTTL: 60,
      });

      await noPrefixAdapter.set('raw-key', 'raw-value');
      const result = await noPrefixAdapter.get<string>('raw-key');
      expect(result).toBe('raw-value');
    });
  });
});
