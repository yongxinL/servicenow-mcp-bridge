---
id: config-gated-features
trigger: "when implementing complex or surprising features"
confidence: 0.8
domain: "architecture"
source: "session-observation"
phase: "2,3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["configuration", "feature-flags", "opt-in", "defaults", "circuit-breaker"]
---

# Config-Gate Complex Features with Opt-In (Disabled by Default)

## Action

For features that add complexity or could cause surprising behavior (circuit breakers, aggressive caching, automatic retries with side effects), make them **disabled by default** and require explicit opt-in via configuration.

## Evidence

- Circuit breaker disabled by default in T-1.3.3
- Users must set `circuit_breaker.enabled: true` to activate
- When disabled, zero overhead (bypassed completely)
- Prevents confusion when circuit opens unexpectedly
- Follows principle of least surprise

## Example

```typescript
// ✅ PREFER: Config-gated with disabled default
export interface CircuitBreakerConfig {
  enabled: boolean; // Defaults to false
  failureThreshold: number;
  resetTimeoutMs: number;
}

export const DEFAULT_CONFIG = {
  enabled: false, // Must explicitly opt-in
  failureThreshold: 5,
  resetTimeoutMs: 30000,
};

export class CircuitBreaker {
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Bypass when disabled - zero overhead
    if (!this.config.enabled) {
      return operation();
    }
    // ... circuit breaker logic
  }
}

// ❌ AVOID: Complex features enabled by default
export const DEFAULT_CONFIG = {
  enabled: true, // Surprising behavior for users who don't understand circuit breakers
  // ...
};
```

## When to Use Config-Gating

**Features that should be disabled by default:**
- Circuit breakers (can cause confusing "service down" errors)
- Aggressive caching (can hide data freshness issues)
- Automatic request modification (changing user intent)
- Experimental features
- Features with significant performance trade-offs

**Features that can be enabled by default:**
- Rate limiting (protective, expected behavior)
- Retry on transient failures (expected, improves reliability)
- Logging (observability)
- Input validation (security)

## Benefits

1. **Principle of least surprise**: Users aren't hit with unexpected behavior
2. **Opt-in adoption**: Users who enable it understand what they're getting
3. **Zero overhead when disabled**: No performance cost for unused features
4. **Safer defaults**: Conservative defaults reduce production issues
5. **Clear documentation**: Explicit flag in config is self-documenting

## Configuration Pattern

```typescript
// Config schema with clear opt-in
{
  circuit_breaker: {
    enabled: false,              // Explicit flag
    failure_threshold: 5,        // Config ready but inactive
    reset_timeout_ms: 30000
  }
}

// Documentation should explain:
// - What the feature does
// - Why it's disabled by default
// - When users should enable it
// - What to expect when enabled
```

## Related Patterns

- Feature flags for gradual rollouts
- Capability toggles for optional modules
- Kill switches for emergency feature disabling
