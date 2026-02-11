/**
 * Circuit breaker for preventing repeated calls to failing services.
 * Implements three-state pattern: CLOSED, OPEN, HALF_OPEN.
 */

import { ServiceNowHttpError } from '../client/types.js';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Normal operation - all requests pass through */
  CLOSED = 'CLOSED',
  /** Circuit is open - all requests fail immediately */
  OPEN = 'OPEN',
  /** Testing if service has recovered - one probe request allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Configuration for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  /** Whether circuit breaker is enabled (default: false) */
  enabled: boolean;

  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold: number;

  /** Time in ms to wait before attempting reset (default: 30000) */
  resetTimeoutMs: number;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  enabled: false, // Disabled by default
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
};

/**
 * Error thrown when circuit breaker is open (fast fail)
 */
export class CircuitOpenError extends Error {
  constructor(public readonly remainingMs: number) {
    const seconds = Math.ceil(remainingMs / 1000);
    super(`Circuit breaker is open. Reset in ${seconds}s`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit breaker that prevents repeated calls to failing services.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail immediately (fast fail)
 * - HALF_OPEN: Testing if service recovered, one probe request allowed
 *
 * When disabled (config.enabled = false), all requests pass through without
 * any circuit breaker logic.
 *
 * @example
 * const breaker = new CircuitBreaker({
 *   enabled: true,
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000
 * });
 *
 * const result = await breaker.execute(() => client.get('incident'));
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Execute an operation with circuit breaker protection.
   *
   * If circuit is OPEN, throws CircuitOpenError immediately (fast fail).
   * If circuit is CLOSED or HALF_OPEN, executes the operation.
   *
   * Success resets the failure counter and closes the circuit.
   * Circuit-breaking failures increment the counter and may open the circuit.
   *
   * @param operation - Async function to execute
   * @returns Promise resolving to operation result
   * @throws CircuitOpenError if circuit is open
   * @throws Original error if operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Bypass circuit breaker when disabled
    if (!this.config.enabled) {
      return operation();
    }

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        // Transition to HALF_OPEN to allow probe request
        this.state = CircuitState.HALF_OPEN;
      } else {
        // Fast fail - don't execute operation
        throw new CircuitOpenError(this.remainingResetTime());
      }
    }

    // Execute operation (in CLOSED or HALF_OPEN state)
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful operation.
   * Resets failure counter and closes circuit.
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  /**
   * Handle failed operation.
   * Increments failure counter for circuit-breaking errors.
   * Opens circuit if threshold reached or if in HALF_OPEN state.
   */
  private onFailure(error: unknown): void {
    // Only count circuit-breaking errors (server errors, network errors)
    if (!this.isCircuitBreakingError(error)) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = this.now();

    // Open circuit if:
    // 1. In HALF_OPEN state (probe failed)
    // 2. Failure threshold reached in CLOSED state
    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Determine if error should trip the circuit breaker.
   *
   * Circuit-breaking errors:
   * - HTTP 5xx (server errors) - indicates service is failing
   * - Network errors (TypeError, AbortError) - indicates connectivity issues
   *
   * Non-circuit-breaking errors:
   * - HTTP 4xx (client errors) - indicates bad request, not service failure
   * - HTTP 429 (rate limited) - handled by rate limiter, not service failure
   */
  private isCircuitBreakingError(error: unknown): boolean {
    // Server errors (5xx)
    if (error instanceof ServiceNowHttpError) {
      return error.statusCode >= 500;
    }

    // Network errors from fetch
    if (error instanceof TypeError) {
      return true;
    }

    // Timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    return false;
  }

  /**
   * Check if enough time has passed to attempt circuit reset.
   */
  private shouldAttemptReset(): boolean {
    return (
      this.now() - this.lastFailureTime >= this.config.resetTimeoutMs
    );
  }

  /**
   * Calculate remaining time until circuit reset attempt.
   */
  private remainingResetTime(): number {
    const elapsed = this.now() - this.lastFailureTime;
    return Math.max(0, this.config.resetTimeoutMs - elapsed);
  }

  /**
   * Get current circuit state.
   */
  get currentState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count.
   */
  get failures(): number {
    return this.failureCount;
  }

  /**
   * Get circuit breaker configuration.
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }
}
