---
id: promise-lock-pattern
trigger: "when implementing token refresh or preventing concurrent async operations"
confidence: 0.9
domain: "code-style"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["async", "concurrency", "oauth", "token-refresh", "promise", "lock"]
---

# Use Promise Lock to Prevent Concurrent Token Refreshes

## Action

When implementing token refresh or any async operation that should only run once concurrently, use a **promise lock** pattern: store the ongoing promise and return it to subsequent callers.

## Evidence

- Successfully implemented in OAuthStrategy (T-1.2.1)
- Prevents multiple concurrent token refresh requests
- Tested and verified with 33 unit tests
- Common pattern in authentication systems

## Example

```typescript
// ✅ PREFER: Promise lock pattern
class OAuthStrategy {
  private token: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<void> | null = null;

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.needsRefresh()) {
      await this.refresh();
    }
    return { Authorization: `Bearer ${this.token}` };
  }

  private async refresh(): Promise<void> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start a new refresh and store the promise
    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null; // Clear lock when done
    }
  }

  private async doRefresh(): Promise<void> {
    // Actual token fetch logic
    const response = await fetch(tokenEndpoint, { ... });
    this.token = response.access_token;
    this.expiresAt = Date.now() + response.expires_in * 1000;
  }
}

// ❌ AVOID: No lock - causes race condition
class BadOAuthStrategy {
  private async refresh(): Promise<void> {
    // Multiple callers will each make a token request
    const response = await fetch(tokenEndpoint, { ... });
    this.token = response.access_token;
  }
}
```

## How It Works

1. First caller enters `refresh()`, sets `refreshPromise` to the ongoing promise
2. Subsequent callers see `refreshPromise` is set, return the same promise
3. All callers wait for the same token fetch to complete
4. Promise lock is cleared in `finally` block after completion

## Benefits

1. **Prevents redundant requests** - Only one token fetch happens
2. **Thread-safe for Node.js** - Works in single-threaded event loop
3. **Simple implementation** - No need for mutex libraries
4. **Handles errors correctly** - All waiting callers receive the same error

## When to Apply

- OAuth token refresh
- Lazy-loaded expensive resources (database connections, config files)
- Cache warming operations
- Any idempotent async operation that should run once concurrently

## Testing Strategy

```typescript
it('should prevent concurrent refreshes', async () => {
  vi.useRealTimers(); // Use real timers for concurrency

  let fetchCount = 0;
  const mockFetch = vi.fn().mockImplementation(async () => {
    fetchCount++;
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate delay
    return { ok: true, json: async () => ({ access_token: 'token' }) };
  });

  // Make multiple concurrent calls
  await Promise.all([
    strategy.getAuthHeaders(),
    strategy.getAuthHeaders(),
    strategy.getAuthHeaders(),
  ]);

  expect(fetchCount).toBe(1); // Only one fetch despite 3 calls
});
```

## Related Patterns

- Singleton pattern for resource initialization
- Debouncing for user input handling
- Rate limiting for API calls
