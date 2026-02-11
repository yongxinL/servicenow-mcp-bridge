/**
 * Token bucket rate limiter for ServiceNow API requests.
 * Throttles requests to respect ServiceNow rate limits without dropping any requests.
 */

/**
 * Token bucket rate limiter that delays requests when capacity is exhausted.
 *
 * The token bucket algorithm works as follows:
 * 1. A bucket holds up to `burstSize` tokens
 * 2. Tokens are added at a rate of `maxPerHour / 3600 / 1000` tokens per millisecond
 * 3. Each request consumes 1 token
 * 4. If tokens are available, the request proceeds immediately
 * 5. If no tokens are available, the request waits until a token is refilled
 *
 * @example
 * const limiter = new RateLimiter(1000, 20); // 1000 req/hour, burst of 20
 * await limiter.acquire(); // Wait for token before making request
 * await serviceNowClient.get('incident'); // Now make the request
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly refillRate: number; // tokens per millisecond

  /**
   * Create a new rate limiter.
   *
   * @param maxPerHour - Maximum requests per hour (default: 1000)
   * @param burstSize - Maximum burst capacity in tokens (default: 20)
   * @param now - Time function for testing (default: Date.now)
   */
  constructor(
    private readonly maxPerHour: number = 1000,
    private readonly burstSize: number = 20,
    private readonly now: () => number = Date.now,
  ) {
    if (maxPerHour <= 0) {
      throw new Error('maxPerHour must be positive');
    }
    if (burstSize <= 0) {
      throw new Error('burstSize must be positive');
    }

    this.tokens = burstSize; // Start with full bucket
    this.lastRefill = this.now();
    this.refillRate = maxPerHour / (3600 * 1000); // tokens per millisecond
  }

  /**
   * Acquire a token from the bucket.
   * If tokens are available, returns immediately.
   * If no tokens are available, waits until a token is refilled.
   *
   * @returns Promise that resolves when a token is acquired
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time until 1 token is available
    const tokensNeeded = 1 - this.tokens;
    const waitMs = Math.ceil(tokensNeeded / this.refillRate);

    await this.delay(waitMs);

    // Refill again after waiting
    this.refill();
    this.tokens -= 1;
  }

  /**
   * Refill tokens based on elapsed time since last refill.
   * Tokens are capped at burstSize.
   */
  private refill(): void {
    const currentTime = this.now();
    const elapsed = currentTime - this.lastRefill;

    // Add tokens based on elapsed time
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = currentTime;
  }

  /**
   * Delay execution for a specified number of milliseconds.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current token count (for testing/monitoring).
   * Note: This reflects tokens at the current moment after refill.
   */
  getTokenCount(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get rate limiter configuration.
   */
  getConfig(): { maxPerHour: number; burstSize: number } {
    return {
      maxPerHour: this.maxPerHour,
      burstSize: this.burstSize,
    };
  }
}
