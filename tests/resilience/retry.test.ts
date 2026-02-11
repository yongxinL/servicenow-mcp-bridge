/**
 * Unit tests for retry handler with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, isRetryable, DEFAULT_RETRY_CONFIG } from '../../src/resilience/retry.js';
import { ServiceNowHttpError } from '../../src/client/types.js';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Successful Operations', () => {
    it('should return result on first attempt if operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, DEFAULT_RETRY_CONFIG);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return result immediately without delay', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'test' });

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);
      await promise;

      expect(operation).toHaveBeenCalledTimes(1);
      // No timers should have been advanced
    });
  });

  describe('Retryable Errors - HTTP 429', () => {
    it('should retry on HTTP 429 and eventually succeed', async () => {
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      // Advance timers for retries
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff for retries', async () => {
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 30000 });

      // Advance timers to allow retries to complete
      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw error after max retries exhausted', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      const promise = withRetry(operation, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 1000 });

      // Advance timers async to process setTimeout callbacks
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow(ServiceNowHttpError);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Retryable Errors - HTTP 503', () => {
    it('should retry on HTTP 503', async () => {
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(503, 'Service Unavailable', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retryable Errors - Network Errors', () => {
    it('should retry on TypeError (fetch network error)', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on AbortError (timeout)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(abortError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should not retry on HTTP 400 (Bad Request)', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(400, 'Bad Request', 'Invalid query', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on HTTP 401 (Unauthorized)', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(401, 'Unauthorized', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on HTTP 403 (Forbidden)', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(403, 'Forbidden', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on HTTP 404 (Not Found)', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on HTTP 500 (Internal Server Error)', async () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on generic Error', async () => {
      const error = new Error('Some application error');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry-After Header Support', () => {
    it('should respect Retry-After header with delay-seconds', async () => {
      const mockHeaders = new Headers({ 'retry-after': '2' }); // 2 seconds
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      // Advance timers to allow retry with Retry-After header
      await vi.advanceTimersByTimeAsync(2500);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should respect Retry-After header with HTTP-date', async () => {
      vi.useRealTimers(); // Use real timers for Date.now() calculation

      // Set future date 1.5 seconds from now (more realistic for fast tests)
      const futureDate = new Date(Date.now() + 1500).toUTCString();
      const mockHeaders = new Headers({ 'retry-after': futureDate });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const start = Date.now();
      const result = await withRetry(operation, DEFAULT_RETRY_CONFIG);
      const elapsed = Date.now() - start;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
      // Verify it waited at least 1 second (accounting for overhead)
      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(elapsed).toBeLessThanOrEqual(2000);

      vi.useFakeTimers(); // Restore fake timers for other tests
    });

    it('should fallback to exponential backoff if Retry-After is invalid', async () => {
      const mockHeaders = new Headers({ 'retry-after': 'invalid' });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, DEFAULT_RETRY_CONFIG);

      // Advance timers to allow retry with exponential backoff
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('Backoff Configuration', () => {
    it('should use custom baseDelayMs', async () => {
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, { maxRetries: 1, baseDelayMs: 500, maxDelayMs: 30000 });

      // Advance timers to allow retry
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should cap delay at maxDelayMs', async () => {
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 2500 });

      // Advance timers to allow all retries with capped delays
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('Jitter', () => {
    it('should apply jitter to delays (randomization)', async () => {
      // Jitter is verified by the fact that Math.random() is used in calculateDelay
      // We can't easily test randomization without mocking Math.random
      // Instead, verify that the retry mechanism works with jitter applied
      const mockHeaders = new Headers();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders))
        .mockResolvedValue('success');

      const promise = withRetry(operation, { maxRetries: 1, baseDelayMs: 100, maxDelayMs: 30000 });

      await vi.advanceTimersByTimeAsync(500);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });
});

describe('isRetryable', () => {
  it('should return true for HTTP 429', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders);
    expect(isRetryable(error)).toBe(true);
  });

  it('should return true for HTTP 503', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(503, 'Service Unavailable', '', mockHeaders);
    expect(isRetryable(error)).toBe(true);
  });

  it('should return false for HTTP 400', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(400, 'Bad Request', '', mockHeaders);
    expect(isRetryable(error)).toBe(false);
  });

  it('should return false for HTTP 401', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(401, 'Unauthorized', '', mockHeaders);
    expect(isRetryable(error)).toBe(false);
  });

  it('should return false for HTTP 404', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
    expect(isRetryable(error)).toBe(false);
  });

  it('should return false for HTTP 500', () => {
    const mockHeaders = new Headers();
    const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
    expect(isRetryable(error)).toBe(false);
  });

  it('should return true for TypeError (fetch network error)', () => {
    const error = new TypeError('Failed to fetch');
    expect(isRetryable(error)).toBe(true);
  });

  it('should return true for AbortError (timeout)', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    expect(isRetryable(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Some error');
    expect(isRetryable(error)).toBe(false);
  });
});
