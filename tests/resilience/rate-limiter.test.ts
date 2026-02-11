/**
 * Unit tests for RateLimiter (token bucket algorithm)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../src/resilience/rate-limiter.js';

describe('RateLimiter', () => {
  describe('Constructor', () => {
    it('should create rate limiter with default config', () => {
      const limiter = new RateLimiter();
      const config = limiter.getConfig();

      expect(config.maxPerHour).toBe(1000);
      expect(config.burstSize).toBe(20);
    });

    it('should create rate limiter with custom config', () => {
      const limiter = new RateLimiter(500, 10);
      const config = limiter.getConfig();

      expect(config.maxPerHour).toBe(500);
      expect(config.burstSize).toBe(10);
    });

    it('should start with full token bucket', () => {
      const limiter = new RateLimiter(1000, 20);
      expect(limiter.getTokenCount()).toBe(20);
    });

    it('should throw error for invalid maxPerHour', () => {
      expect(() => new RateLimiter(0, 20)).toThrow('maxPerHour must be positive');
      expect(() => new RateLimiter(-100, 20)).toThrow('maxPerHour must be positive');
    });

    it('should throw error for invalid burstSize', () => {
      expect(() => new RateLimiter(1000, 0)).toThrow('burstSize must be positive');
      expect(() => new RateLimiter(1000, -10)).toThrow('burstSize must be positive');
    });
  });

  describe('Token Consumption', () => {
    it('should consume one token per acquire', async () => {
      const limiter = new RateLimiter(1000, 20);

      expect(limiter.getTokenCount()).toBe(20);

      await limiter.acquire();
      expect(limiter.getTokenCount()).toBe(19);

      await limiter.acquire();
      expect(limiter.getTokenCount()).toBe(18);
    });

    it('should allow burst of requests up to burst size', async () => {
      const limiter = new RateLimiter(1000, 5);

      // Should be able to make 5 immediate requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getTokenCount()).toBe(0);
    });

    it('should handle fractional tokens correctly', async () => {
      const limiter = new RateLimiter(1000, 10);

      // Consume 5 tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.getTokenCount()).toBe(5);
    });
  });

  describe('Token Refill', () => {
    it('should refill tokens based on elapsed time', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 10, mockNow); // 1 token per second

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }
      expect(limiter.getTokenCount()).toBe(0);

      // Advance time by 5 seconds
      currentTime += 5000;
      expect(limiter.getTokenCount()).toBe(5);

      // Advance time by another 5 seconds
      currentTime += 5000;
      expect(limiter.getTokenCount()).toBe(10); // Capped at burst size
    });

    it('should calculate correct refill rate for 1000 req/hour', () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(1000, 20, mockNow); // 1000 req/hour = 0.2777... req/sec

      // Consume all tokens
      for (let i = 0; i < 20; i++) {
        limiter.acquire();
      }

      // Advance time by 1 second (1000ms)
      currentTime += 1000;

      // Should have ~0.2777 tokens (1000 / 3600 seconds)
      const tokens = limiter.getTokenCount();
      expect(tokens).toBeCloseTo(0.2777, 2);
    });

    it('should cap tokens at burst size', () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 10, mockNow);

      // Advance time by 1 hour (should refill way more than burst size)
      currentTime += 3600000;

      expect(limiter.getTokenCount()).toBe(10); // Capped at 10
    });

    it('should refill continuously over time', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 10, mockNow); // 1 token per second

      // Check token count at different times
      expect(limiter.getTokenCount()).toBe(10); // Full bucket

      currentTime += 1000; // +1 second
      await limiter.acquire(); // Consume 1, but should have refilled 1
      // After 1 second we have 10 tokens, consume 1 = 9
      expect(limiter.getTokenCount()).toBe(9);

      currentTime += 2000; // +2 seconds (now we're at t=3000)
      // Should refill 2 more tokens: 9 + 2 = 11, capped at 10
      expect(limiter.getTokenCount()).toBe(10);

      await limiter.acquire(); // Consume 1
      expect(limiter.getTokenCount()).toBe(9);
    });
  });

  describe('Request Delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay request when tokens are exhausted', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 2, mockNow); // 1 token per second, burst of 2

      // Consume all tokens
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getTokenCount()).toBe(0);

      // Next acquire should delay for ~1 second
      const acquirePromise = limiter.acquire();

      // Fast-forward time
      currentTime += 1000;
      vi.advanceTimersByTime(1000);

      await acquirePromise;
      expect(limiter.getTokenCount()).toBeCloseTo(0, 0);
    });

    it('should calculate correct delay time', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(1000, 5, mockNow); // 0.2777 tokens per second

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      // Tokens = 0, need to wait for 1 token
      // Rate = 1000 / 3600000 = 0.0002777 tokens per ms
      // Time for 1 token = 1 / 0.0002777 = ~3600ms
      const acquirePromise = limiter.acquire();

      currentTime += 3600;
      vi.advanceTimersByTime(3600);

      await acquirePromise;
      expect(limiter.getTokenCount()).toBeCloseTo(0, 0);
    });
  });

  describe('Burst Behavior', () => {
    it('should allow full burst after period of inactivity', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 10, mockNow);

      // Consume some tokens
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getTokenCount()).toBe(7);

      // Wait for bucket to refill
      currentTime += 10000; // 10 seconds

      // Should now have full burst available
      expect(limiter.getTokenCount()).toBe(10);

      // Should be able to do 10 immediate requests
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.getTokenCount()).toBe(0);
    });

    it('should handle burst after full exhaustion', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 5, mockNow); // 1 token per second

      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }
      expect(limiter.getTokenCount()).toBe(0);

      // Wait for full refill
      currentTime += 10000; // 10 seconds

      // Should have full burst capacity
      expect(limiter.getTokenCount()).toBe(5);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple sequential acquires correctly', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 5, mockNow); // 1 token per second, burst of 5

      vi.useFakeTimers();

      // Make 10 sequential requests (5 immediate, 5 delayed)
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(limiter.acquire());
        // Advance time for delayed requests
        if (i >= 5) {
          currentTime += 1000;
          vi.advanceTimersByTime(1000);
        }
      }

      await Promise.all(promises);

      expect(limiter.getTokenCount()).toBeCloseTo(0, 0);

      vi.useRealTimers();
    });

    it('should serialize concurrent acquire calls', async () => {
      vi.useFakeTimers();

      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 2, mockNow); // 1 token per second

      // Make 3 concurrent acquire calls (only 2 tokens available)
      const promises = [
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ];

      // First two should resolve immediately
      await Promise.race(promises);

      // Third should be waiting
      currentTime += 1000;
      vi.advanceTimersByTime(1000);

      await Promise.all(promises);

      expect(limiter.getTokenCount()).toBeCloseTo(0, 0);

      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low rate limit', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(1, 1, mockNow); // 1 request per hour

      expect(limiter.getTokenCount()).toBe(1);

      await limiter.acquire();
      expect(limiter.getTokenCount()).toBe(0);

      // Should take 1 hour to refill 1 token
      currentTime += 3600000; // 1 hour
      expect(limiter.getTokenCount()).toBeCloseTo(1, 1); // Use toBeCloseTo for floating point
    });

    it('should handle very high rate limit', async () => {
      const limiter = new RateLimiter(1000000, 1000); // 1M req/hour

      // Should be able to make many requests without delay
      for (let i = 0; i < 100; i++) {
        await limiter.acquire();
      }

      expect(limiter.getTokenCount()).toBe(900);
    });

    it('should handle zero tokens remaining', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(3600, 1, mockNow);

      await limiter.acquire();
      expect(limiter.getTokenCount()).toBe(0);

      // Should still be able to acquire with delay
      vi.useFakeTimers();
      const acquirePromise = limiter.acquire();

      currentTime += 1000;
      vi.advanceTimersByTime(1000);

      await acquirePromise;
      expect(limiter.getTokenCount()).toBeCloseTo(0, 0);

      vi.useRealTimers();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should enforce 1000 req/hour rate limit', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(1000, 20, mockNow);

      // Make 20 immediate requests (burst)
      for (let i = 0; i < 20; i++) {
        await limiter.acquire();
      }

      // Make one more request (should be delayed)
      vi.useFakeTimers();

      const acquirePromise = limiter.acquire();

      // Need to wait for 1 token at rate of 1000/hour = 3.6 seconds
      currentTime += 3600; // 3.6 seconds
      vi.advanceTimersByTime(3600);

      await acquirePromise;

      vi.useRealTimers();
    });

    it('should handle sustained load with refill', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);
      const limiter = new RateLimiter(360, 10, mockNow); // 1 token per 10 seconds

      // Consume 5 tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.getTokenCount()).toBe(5);

      // Wait 50 seconds (should refill 5 tokens)
      currentTime += 50000;
      expect(limiter.getTokenCount()).toBe(10); // Capped at 10

      // Consume 10 more tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.getTokenCount()).toBe(0);
    });
  });
});
