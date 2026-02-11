/**
 * Retry handler with exponential backoff and jitter for transient failures.
 */

import { ServiceNowHttpError } from '../client/types.js';

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;

  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs: number;

  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Retry an async operation with exponential backoff and jitter.
 *
 * Retries on:
 * - HTTP 429 (Rate Limited)
 * - HTTP 503 (Service Unavailable)
 * - Network errors (connection refused, timeout, DNS failure)
 *
 * Does NOT retry on:
 * - HTTP 400, 401, 403, 404, 500 (client/permanent errors)
 * - Other application errors
 *
 * Respects Retry-After header when present.
 *
 * @param operation - Async function to execute with retry
 * @param config - Retry configuration
 * @returns Promise resolving to operation result
 * @throws Last error if all retries are exhausted or error is non-retryable
 *
 * @example
 * const result = await withRetry(
 *   () => client.get('incident'),
 *   { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = attempt < config.maxRetries && isRetryable(error);

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config, error);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

/**
 * Determine if an error is retryable.
 *
 * Retryable errors:
 * - HTTP 429 (Rate Limited) - temporary rate limit
 * - HTTP 503 (Service Unavailable) - temporary service issue
 * - TypeError from fetch - network errors (connection refused, DNS)
 * - AbortError - timeout errors
 *
 * Non-retryable errors:
 * - HTTP 400, 401, 403, 404 - client errors
 * - HTTP 500 - application errors (usually not transient)
 * - All other errors
 */
export function isRetryable(error: unknown): boolean {
  // ServiceNow HTTP errors
  if (error instanceof ServiceNowHttpError) {
    return error.statusCode === 429 || error.statusCode === 503;
  }

  // Network errors from fetch
  if (error instanceof TypeError) {
    return true; // Connection refused, DNS failure, etc.
  }

  // Timeout errors (AbortSignal.timeout)
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  // Not retryable
  return false;
}

/**
 * Calculate delay for next retry attempt with exponential backoff and jitter.
 *
 * Strategy:
 * 1. Check for Retry-After header (takes precedence)
 * 2. Calculate exponential backoff: baseDelay * 2^attempt
 * 3. Cap at maxDelay
 * 4. Apply full jitter: random value between 0 and cappedDelay
 *
 * Full jitter prevents thundering herd problem.
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig,
  error: unknown,
): number {
  // Respect Retry-After header if present
  const retryAfter = getRetryAfterMs(error);
  if (retryAfter !== null) {
    return retryAfter;
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Full jitter: random value between 0 and cappedDelay
  return Math.random() * cappedDelay;
}

/**
 * Parse Retry-After header from error.
 *
 * Retry-After can be:
 * - delay-seconds: integer (e.g., "120")
 * - HTTP-date: full date (e.g., "Wed, 21 Oct 2015 07:28:00 GMT")
 *
 * @returns Delay in milliseconds, or null if not present or invalid
 */
function getRetryAfterMs(error: unknown): number | null {
  if (!(error instanceof ServiceNowHttpError)) {
    return null;
  }

  const retryAfter = error.retryAfter;
  if (!retryAfter) {
    return null;
  }

  // Try parsing as delay-seconds (integer)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as HTTP-date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  // Invalid format
  return null;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
