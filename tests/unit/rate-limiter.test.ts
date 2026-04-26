import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucketRateLimiter, createTrelloRateLimiters } from '../../src/rate-limiter.js';

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with full tokens', () => {
      const limiter = new TokenBucketRateLimiter(10, 1000);
      // Should be able to make 10 requests immediately
      for (let i = 0; i < 10; i++) {
        expect(limiter.canMakeRequest()).toBe(true);
      }
    });

    it('should deny requests when tokens are exhausted', () => {
      const limiter = new TokenBucketRateLimiter(3, 1000);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(true);
      expect(limiter.canMakeRequest()).toBe(false);
    });
  });

  describe('canMakeRequest', () => {
    it('should consume exactly one token per call', () => {
      const limiter = new TokenBucketRateLimiter(5, 1000);
      let count = 0;
      while (limiter.canMakeRequest()) {
        count++;
      }
      expect(count).toBe(5);
    });

    it('should refill tokens over time', () => {
      const limiter = new TokenBucketRateLimiter(10, 1000);
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        limiter.canMakeRequest();
      }
      expect(limiter.canMakeRequest()).toBe(false);

      // Advance time by 500ms (should refill ~5 tokens for 10/1000ms rate)
      vi.advanceTimersByTime(500);
      expect(limiter.canMakeRequest()).toBe(true);
    });

    it('should not exceed maxTokens when refilling', () => {
      const limiter = new TokenBucketRateLimiter(5, 1000);
      // Don't use any tokens, advance time far ahead
      vi.advanceTimersByTime(10000);
      // Should still only have 5 tokens max
      let count = 0;
      while (limiter.canMakeRequest()) {
        count++;
      }
      expect(count).toBe(5);
    });

    it('should refill at the correct rate', () => {
      const limiter = new TokenBucketRateLimiter(100, 10000); // 100 per 10s = 10/s
      // Exhaust all tokens
      for (let i = 0; i < 100; i++) {
        limiter.canMakeRequest();
      }
      // Advance 1 second - should have ~10 tokens
      vi.advanceTimersByTime(1000);
      let count = 0;
      while (limiter.canMakeRequest()) {
        count++;
      }
      expect(count).toBe(10);
    });
  });

  describe('waitForAvailableToken', () => {
    it('should resolve immediately when tokens are available', async () => {
      const limiter = new TokenBucketRateLimiter(10, 1000);
      await limiter.waitForAvailableToken();
      // If we got here, it resolved
      expect(true).toBe(true);
    });

    it('should wait and resolve when tokens become available', async () => {
      const limiter = new TokenBucketRateLimiter(1, 1000);
      // Exhaust the one token
      limiter.canMakeRequest();

      let resolved = false;
      const promise = limiter.waitForAvailableToken().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      // Advance time to allow refill
      vi.advanceTimersByTime(1100);
      await promise;
      expect(resolved).toBe(true);
    });
  });
});

describe('createTrelloRateLimiters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create limiters with correct Trello limits', () => {
    const limiters = createTrelloRateLimiters();
    expect(limiters).toHaveProperty('apiKeyLimiter');
    expect(limiters).toHaveProperty('tokenLimiter');
    expect(limiters).toHaveProperty('canMakeRequest');
    expect(limiters).toHaveProperty('waitForAvailableToken');
  });

  it('should respect the token limiter (100 per 10s) as the tighter constraint', () => {
    const limiters = createTrelloRateLimiters();
    // The token limiter is 100 per 10s, API key is 300 per 10s
    // After 100 requests, canMakeRequest should return false (token limiter exhausted)
    for (let i = 0; i < 100; i++) {
      expect(limiters.canMakeRequest()).toBe(true);
    }
    expect(limiters.canMakeRequest()).toBe(false);
  });

  it('canMakeRequest consumes tokens from both limiters', () => {
    const limiters = createTrelloRateLimiters();
    // Make 100 requests (exhausts token limiter)
    for (let i = 0; i < 100; i++) {
      limiters.canMakeRequest();
    }
    // Wait for token limiter to refill but API key limiter still has tokens
    vi.advanceTimersByTime(10000);
    // Should work again
    expect(limiters.canMakeRequest()).toBe(true);
  });

  it('waitForAvailableToken waits for both limiters', async () => {
    const limiters = createTrelloRateLimiters();
    // Exhaust token limiter
    for (let i = 0; i < 100; i++) {
      limiters.canMakeRequest();
    }

    let resolved = false;
    const promise = limiters.waitForAvailableToken().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1100);
    await promise;
    expect(resolved).toBe(true);
  });
});
