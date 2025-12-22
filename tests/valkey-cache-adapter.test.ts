import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ValkeyCacheAdapter } from '../src/cache/valkey-cache-adapter.js';

/**
 * Tests for ValkeyCacheAdapter
 *
 * These tests verify the Valkey/Redis cache adapter functionality.
 * Tests are designed to work both with and without a running Valkey server.
 */

describe('ValkeyCacheAdapter', () => {
  describe('Configuration', () => {
    it('should create adapter with default configuration', () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://localhost:6379',
        defaultTTL: 120,
      });

      expect(adapter).toBeDefined();
      expect(adapter.isReady()).toBe(false); // Not connected yet
    });

    it('should accept custom configuration', () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://custom-host:6380',
        defaultTTL: 300,
        keyPrefix: 'custom-prefix',
        connectTimeout: 10000,
        maxRetries: 5,
      });

      expect(adapter).toBeDefined();
    });

    it('should report not ready before connection', () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://localhost:6379',
        defaultTTL: 120,
      });

      expect(adapter.isReady()).toBe(false);
    });

    it('should return empty stats when not connected', () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://localhost:6379',
        defaultTTL: 120,
      });

      const stats = adapter.getStats();
      expect(stats.connected).toBe(false);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should return sync stats from getStatsAsync when not connected', async () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://localhost:6379',
        defaultTTL: 120,
      });

      const stats = await adapter.getStatsAsync();
      expect(stats.connected).toBe(false);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Graceful Fallback (No Valkey Server)', () => {
    let adapter: ValkeyCacheAdapter;

    beforeEach(() => {
      // Use a non-existent host to test fallback behavior
      adapter = new ValkeyCacheAdapter({
        url: 'redis://192.0.2.1:6379', // TEST-NET-1, guaranteed unreachable
        defaultTTL: 120,
        keyPrefix: 'test',
        connectTimeout: 500, // Short but reasonable timeout
        maxRetries: 0, // Don't retry
      });
    });

    it('should return undefined for get when not connected', async () => {
      const result = await adapter.get<string>('test-key');
      expect(result).toBeUndefined();
    });

    it('should return false for set when not connected', async () => {
      const result = await adapter.set('test-key', 'test-value');
      expect(result).toBe(false);
    });

    it('should return 0 for del when not connected', async () => {
      const result = await adapter.del('test-key');
      expect(result).toBe(0);
    });

    it('should return 0 for deleteByPattern when not connected', async () => {
      const result = await adapter.deleteByPattern('test-*');
      expect(result).toBe(0);
    });

    it('should return empty array for keys when not connected', async () => {
      const result = await adapter.keys('test-*');
      expect(result).toEqual([]);
    });

    it('should return false for has when not connected', async () => {
      const result = await adapter.has('test-key');
      expect(result).toBe(false);
    });

    it('should not throw on flushAll when not connected', async () => {
      await expect(adapter.flushAll()).resolves.toBeUndefined();
    });

    it('should track misses even when not connected', async () => {
      await adapter.get('key1');
      await adapter.get('key2');
      await adapter.get('key3');

      const stats = adapter.getStats();
      expect(stats.misses).toBe(3);
      expect(stats.hits).toBe(0);
    });
  });

  describe('Connection Handling', () => {
    it('should handle connection failure gracefully', async () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://192.0.2.1:6379', // TEST-NET-1, guaranteed unreachable
        defaultTTL: 120,
        connectTimeout: 500,
        maxRetries: 0,
      });

      // Connection should fail but not throw unhandled error
      await expect(adapter.connect()).rejects.toThrow();
      expect(adapter.isReady()).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://192.0.2.1:6379', // TEST-NET-1, guaranteed unreachable
        defaultTTL: 120,
      });

      // Should not throw
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('should not reconnect if already connecting', async () => {
      const adapter = new ValkeyCacheAdapter({
        url: 'redis://192.0.2.1:6379', // TEST-NET-1, guaranteed unreachable
        defaultTTL: 120,
        connectTimeout: 500,
        maxRetries: 0,
      });

      // Start multiple connections simultaneously
      const promises = [
        adapter.connect().catch(() => {}),
        adapter.connect().catch(() => {}),
        adapter.connect().catch(() => {}),
      ];

      // Should not throw
      await Promise.all(promises);
    });
  });
});

/**
 * Integration tests - these require a running Valkey/Redis server
 * Skip these tests if no server is available
 */
describe('ValkeyCacheAdapter Integration', () => {
  let adapter: ValkeyCacheAdapter;
  let serverAvailable = false;

  beforeEach(async () => {
    adapter = new ValkeyCacheAdapter({
      url: process.env.TRELLO_VALKEY_URL || 'redis://localhost:6379',
      defaultTTL: 10, // Short TTL for tests
      keyPrefix: 'test-integration',
      connectTimeout: 2000, // Allow time for connection through Podman network
      maxRetries: 2,
    });

    try {
      await adapter.connect();
      serverAvailable = adapter.isReady();
      if (serverAvailable) {
        // Clean up any existing test keys
        await adapter.flushAll();
      }
    } catch {
      serverAvailable = false;
    }
  });

  afterEach(async () => {
    if (serverAvailable) {
      await adapter.flushAll();
    }
    await adapter.disconnect();
  });

  it('should connect to Valkey server', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    expect(adapter.isReady()).toBe(true);
    expect(adapter.getStats().connected).toBe(true);
  });

  it('should set and get values', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    const testData = { name: 'Test Card', id: '123' };
    await adapter.set('card:123', testData);

    const result = await adapter.get<typeof testData>('card:123');
    expect(result).toEqual(testData);
  });

  it('should handle complex objects', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    const complexData = {
      id: '456',
      name: 'Complex Card',
      labels: ['urgent', 'bug'],
      nested: {
        checklist: ['item1', 'item2'],
        metadata: { created: new Date().toISOString() },
      },
    };

    await adapter.set('card:456', complexData);
    const result = await adapter.get<typeof complexData>('card:456');
    expect(result).toEqual(complexData);
  });

  it('should respect TTL', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    await adapter.set('expiring-key', 'value', 1); // 1 second TTL

    // Should exist immediately
    let result = await adapter.get<string>('expiring-key');
    expect(result).toBe('value');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Should be expired
    result = await adapter.get<string>('expiring-key');
    expect(result).toBeUndefined();
  });

  it('should delete keys', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    await adapter.set('to-delete', 'value');
    expect(await adapter.get('to-delete')).toBe('value');

    const deleted = await adapter.del('to-delete');
    expect(deleted).toBe(1);

    expect(await adapter.get('to-delete')).toBeUndefined();
  });

  it('should delete by pattern', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    // Set multiple keys with same prefix
    await adapter.set('cards:list1:card1', 'data1');
    await adapter.set('cards:list1:card2', 'data2');
    await adapter.set('cards:list1:card3', 'data3');
    await adapter.set('cards:list2:card1', 'other');

    // Delete all cards from list1
    const deleted = await adapter.deleteByPattern('cards:list1:*');
    expect(deleted).toBe(3);

    // Verify deletion
    expect(await adapter.get('cards:list1:card1')).toBeUndefined();
    expect(await adapter.get('cards:list1:card2')).toBeUndefined();
    expect(await adapter.get('cards:list2:card1')).toBe('other'); // Should still exist
  });

  it('should list keys by pattern', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    await adapter.set('board:1:lists', ['list1']);
    await adapter.set('board:1:labels', ['label1']);
    await adapter.set('board:2:lists', ['list2']);

    const board1Keys = await adapter.keys('board:1:*');
    expect(board1Keys.length).toBe(2);
    expect(board1Keys).toContain('board:1:lists');
    expect(board1Keys).toContain('board:1:labels');
  });

  it('should check key existence', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    await adapter.set('exists-key', 'value');

    expect(await adapter.has('exists-key')).toBe(true);
    expect(await adapter.has('nonexistent-key')).toBe(false);
  });

  it('should track hits and misses', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    // Create fresh adapter for clean stats
    const freshAdapter = new ValkeyCacheAdapter({
      url: process.env.TRELLO_VALKEY_URL || 'redis://localhost:6379',
      defaultTTL: 10,
      keyPrefix: 'test-stats',
    });
    await freshAdapter.connect();

    await freshAdapter.set('hit-key', 'value');

    // Generate hits
    await freshAdapter.get('hit-key');
    await freshAdapter.get('hit-key');

    // Generate misses
    await freshAdapter.get('miss-key');
    await freshAdapter.get('another-miss');

    const stats = freshAdapter.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);

    await freshAdapter.disconnect();
  });

  it('should flush all keys with prefix', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    await adapter.set('key1', 'value1');
    await adapter.set('key2', 'value2');
    await adapter.set('key3', 'value3');

    await adapter.flushAll();

    expect(await adapter.get('key1')).toBeUndefined();
    expect(await adapter.get('key2')).toBeUndefined();
    expect(await adapter.get('key3')).toBeUndefined();
  });

  it('should return real-time stats via getStatsAsync', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    // Create fresh adapter for clean stats
    const freshAdapter = new ValkeyCacheAdapter({
      url: process.env.TRELLO_VALKEY_URL || 'redis://localhost:6379',
      defaultTTL: 10,
      keyPrefix: 'test-async-stats',
    });
    await freshAdapter.connect();
    await freshAdapter.flushAll();

    // Set a key and get it to generate hits
    await freshAdapter.set('stat-key', 'value');
    await freshAdapter.get('stat-key');
    await freshAdapter.get('stat-key');
    await freshAdapter.get('nonexistent');

    // Get async stats (should query Valkey INFO)
    const stats = await freshAdapter.getStatsAsync();
    expect(stats.connected).toBe(true);
    // Note: Valkey INFO stats are server-wide, so we just verify the structure
    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
    expect(stats.hits).toBeGreaterThanOrEqual(0);
    expect(stats.misses).toBeGreaterThanOrEqual(0);

    await freshAdapter.disconnect();
  });

  it('should return key count via getStatsAsync', async () => {
    if (!serverAvailable) {
      console.log('Skipping: Valkey server not available');
      return;
    }

    // Create fresh adapter
    const freshAdapter = new ValkeyCacheAdapter({
      url: process.env.TRELLO_VALKEY_URL || 'redis://localhost:6379',
      defaultTTL: 10,
      keyPrefix: 'test-keycount',
    });
    await freshAdapter.connect();

    // Set some keys
    await freshAdapter.set('key1', 'value1');
    await freshAdapter.set('key2', 'value2');
    await freshAdapter.set('key3', 'value3');

    // Get async stats
    const stats = await freshAdapter.getStatsAsync();
    // Keys count should be >= 3 (could be more from other tests)
    expect(stats.keys).toBeGreaterThanOrEqual(3);

    await freshAdapter.flushAll();
    await freshAdapter.disconnect();
  });
});
