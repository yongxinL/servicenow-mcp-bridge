---
id: vitest-fake-timers-concurrency
trigger: "when testing concurrent async operations with vitest fake timers"
confidence: 0.8
domain: "testing"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["vitest", "testing", "async", "fake-timers", "concurrency"]
---

# Vitest Fake Timers Don't Work for Concurrency Tests

## Action

When testing concurrent async operations (like promise locks or race conditions), use **real timers** instead of fake timers in vitest. Fake timers can cause tests to hang because setTimeout/Promise timing doesn't advance properly.

## Evidence

- Encountered test timeout when testing OAuth concurrent token refresh
- Test hung at 5000ms timeout with fake timers enabled
- Switching to `vi.useRealTimers()` for that specific test immediately resolved the issue
- Pattern observed in T-1.2.1 (Auth strategies) implementation

## Example

```typescript
// ❌ AVOID: This will timeout with fake timers
describe('concurrent operations', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // Will cause issues
  });

  it('should prevent concurrent refreshes', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Won't advance
      return { ok: true };
    });
    // Test will hang
  });
});

// ✅ PREFER: Use real timers for concurrency tests
describe('concurrent operations', () => {
  it('should prevent concurrent refreshes', async () => {
    vi.useRealTimers(); // Explicitly use real timers

    const mockFetch = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Will work
      return { ok: true };
    });

    // Test works correctly
    vi.useFakeTimers(); // Restore fake timers for other tests
  });
});
```

## When to Apply

- Testing concurrent async operations
- Testing promise locks or race condition handling
- Testing real setTimeout/setInterval behavior
- When tests inexplicably timeout despite correct logic

## When NOT to Apply

- Testing time-based logic that needs time manipulation (token expiry, timeouts, etc.)
- Testing debounce/throttle functions
- Testing scheduled operations

## Related Patterns

- Use fake timers for: token expiry simulation, timeout testing, date mocking
- Use real timers for: actual async behavior, network simulation, concurrency
