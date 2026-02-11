---
id: error-classification-hierarchy
trigger: "when implementing error handling with different strategies (retry, circuit breaker)"
confidence: 0.9
domain: "architecture"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["error-handling", "http", "retry", "circuit-breaker", "classification"]
---

# Error Classification Hierarchy for Resilience Patterns

## Action

When implementing resilience patterns (retry, circuit breaker), establish a clear **error classification hierarchy** that distinguishes between transient errors, server failures, and client mistakes.

## Evidence

- Applied consistently across retry handler (T-1.3.2) and circuit breaker (T-1.3.3)
- Three distinct error classes with different handling strategies
- HTTP 429 intentionally treated differently (retryable but not circuit-breaking)
- Clear separation prevents false positives and inappropriate handling

## Error Classification

### 1. Transient Errors (Retryable, Not Circuit-Breaking)

**Characteristics:** Temporary issues that resolve with time/retries
- **HTTP 429** (Too Many Requests) - rate limit, wait and retry
- **HTTP 503** (Service Unavailable) - temporary overload, retry

**Handling:**
- ✅ Retry with exponential backoff
- ✅ Respect Retry-After header
- ❌ Don't trip circuit (handled by rate limiter)

### 2. Server Failures (Retryable AND Circuit-Breaking)

**Characteristics:** Service is genuinely failing
- **HTTP 5xx** (500, 502, 504, etc.) - server error, bad gateway
- **Network errors** (TypeError, connection refused, DNS failure)
- **Timeout errors** (AbortError)

**Handling:**
- ✅ Retry (might be transient)
- ✅ Count toward circuit breaker threshold
- ✅ Trip circuit after repeated failures

### 3. Client Errors (Non-Retryable, Not Circuit-Breaking)

**Characteristics:** Request is malformed, unauthorized, or invalid
- **HTTP 4xx** (400, 401, 403, 404) - bad request, unauthorized, forbidden, not found
- **Application errors** - validation errors, business logic errors

**Handling:**
- ❌ Don't retry (won't succeed on retry)
- ❌ Don't count toward circuit (service is fine, request is bad)
- ✅ Propagate immediately to caller

## Example Implementation

```typescript
// ✅ PREFER: Clear classification functions

// Retry handler: Which errors should we retry?
function isRetryable(error: unknown): boolean {
  if (error instanceof ServiceNowHttpError) {
    return error.statusCode === 429 || error.statusCode === 503;
  }
  if (error instanceof TypeError) return true; // Network error
  if (error instanceof Error && error.name === 'AbortError') return true; // Timeout
  return false;
}

// Circuit breaker: Which errors indicate service failure?
function isCircuitBreakingError(error: unknown): boolean {
  if (error instanceof ServiceNowHttpError) {
    return error.statusCode >= 500; // 5xx only, not 429!
  }
  if (error instanceof TypeError) return true; // Network error
  if (error instanceof Error && error.name === 'AbortError') return true; // Timeout
  return false;
}

// ❌ AVOID: Treating all errors the same
function shouldRetry(error: unknown): boolean {
  return error instanceof ServiceNowHttpError; // Too broad!
}
```

## Key Insights

### HTTP 429 is Special
**Retryable:** Yes - it's temporary, just need to wait
**Circuit-breaking:** No - service is fine, just rate limited
**Rationale:** Tripping circuit on 429 would be counterproductive; rate limiter handles this

### 4xx Means Client Error, Not Service Failure
**Don't retry:** The same bad request will fail again
**Don't trip circuit:** The service is working correctly, request is invalid

### 5xx Means Service Failure
**Do retry:** Might be transient (temporary overload, deployment)
**Do trip circuit:** Repeated 5xx indicates genuine service degradation

## Testing Pattern

```typescript
describe('Error Classification', () => {
  it('should retry 429 but not trip circuit', () => {
    // Verify 429 is retryable but not circuit-breaking
  });

  it('should retry and trip circuit on 500', () => {
    // Verify 500 is both retryable and circuit-breaking
  });

  it('should not retry or trip circuit on 404', () => {
    // Verify 404 is neither
  });
});
```

## Benefits

1. **Prevents false positives**: Bad requests don't trip circuit
2. **Appropriate handling**: Each error class gets right treatment
3. **Clear separation**: Easy to understand and maintain
4. **Testable**: Each classification is independently verifiable

## When to Apply

- Implementing retry logic
- Implementing circuit breakers
- Designing error handling middleware
- Building resilient API clients

## Related Patterns

- Retry with exponential backoff (for transient errors)
- Circuit breaker pattern (for server failures)
- Fail fast (for client errors)
