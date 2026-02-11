---
id: time-injection-pattern
trigger: "when implementing time-based logic (delays, timeouts, expiry)"
confidence: 0.9
domain: "testing"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["testing", "time", "dependency-injection", "testability", "fake-timers"]
---

# Time Injection Pattern for Testable Time-Based Logic

## Action

When implementing components with time-based behavior (rate limiting, token expiry, circuit breaker timeouts), inject time via **constructor parameter** with default `Date.now`. This enables instant, deterministic testing without real delays.

## Evidence

- Applied consistently across resilience layer (T-1.3.1, T-1.3.2, T-1.3.3)
- Rate limiter: token refill based on elapsed time
- OAuth: token expiry checking
- Circuit breaker: reset timeout calculation
- All time-based tests run in <10ms with fake timers
- Zero flaky tests due to timing issues (when properly implemented)

## Example

```typescript
// ✅ PREFER: Time injection for testability
export class RateLimiter {
  private lastRefill: number;

  constructor(
    private readonly maxPerHour: number = 1000,
    private readonly now: () => number = Date.now, // Inject time function
  ) {
    this.lastRefill = this.now();
  }

  refill(): void {
    const currentTime = this.now(); // Use injected time
    const elapsed = currentTime - this.lastRefill;
    // ...
  }
}

// Test with fake time
let currentTime = 0;
const mockNow = vi.fn(() => currentTime);
const limiter = new RateLimiter(1000, mockNow);

// Advance time instantly
currentTime += 5000;
expect(limiter.getTokenCount()).toBe(5); // Instant verification

// ❌ AVOID: Direct Date.now() calls (not testable)
export class RateLimiter {
  refill(): void {
    const elapsed = Date.now() - this.lastRefill; // Hard to test
    // Tests must use real delays or complex mocking
  }
}
```

## Benefits

1. **Fast tests**: No real setTimeout delays, tests run in milliseconds
2. **Deterministic**: Time advances exactly as specified, no flakiness
3. **Zero overhead**: Production code uses `Date.now` by default
4. **Simple**: One parameter, clear intent, no complex mocking

## When to Apply

- Rate limiters with token refill over time
- Token/session expiry checking (OAuth, JWT)
- Circuit breakers with reset timeouts
- Retry handlers with backoff delays (use with fake timers for delay simulation)
- Any component that checks or waits for time passage

## Implementation Pattern

```typescript
// Constructor signature
constructor(
  // ... other params
  private readonly now: () => number = Date.now, // Last param, default to Date.now
) {}

// Usage throughout class
const currentTime = this.now(); // Always use injected function
const elapsed = this.now() - this.lastEvent;

// In tests
let currentTime = 0;
const mockNow = vi.fn(() => currentTime);
const component = new Component(config, mockNow);

// Advance time
currentTime += 1000; // Instant
expect(component.someTimeBasedCheck()).toBe(expected);
```

## Related Patterns

- Use with vitest fake timers (`vi.useFakeTimers()`) for setTimeout/setInterval
- Combine with `vi.advanceTimersByTimeAsync()` for async delay testing
- Pattern established in OAuth strategy (T-1.2.1), reinforced in resilience layer
