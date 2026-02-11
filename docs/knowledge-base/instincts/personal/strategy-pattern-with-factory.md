---
id: strategy-pattern-with-factory
trigger: "when implementing pluggable behavior with multiple implementations"
confidence: 0.8
domain: "architecture"
source: "session-observation"
phase: "2,3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["design-patterns", "strategy-pattern", "factory", "typescript", "extensibility"]
---

# Use Strategy Pattern with Factory Function for Pluggable Behavior

## Action

When implementing pluggable behavior with multiple implementations (auth methods, payment providers, notification channels), use the **Strategy pattern** with a **factory function** for type-safe selection.

## Evidence

- Successfully implemented in T-1.2.1 (Auth strategies)
- Clean separation: BasicAuthStrategy, OAuthStrategy, TokenAuthStrategy
- Factory function provides type-safe selection based on discriminated union
- Easy to test (each strategy in isolation) and extend (add new strategies)

## Example

```typescript
// ✅ PREFER: Strategy pattern with factory
// 1. Define strategy interface
export interface AuthStrategy {
  getAuthHeaders(): Promise<Record<string, string>>;
}

// 2. Implement concrete strategies
export class BasicAuthStrategy implements AuthStrategy {
  constructor(private username: string, private password: string) {}
  async getAuthHeaders() {
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
}

export class OAuthStrategy implements AuthStrategy {
  constructor(private clientId: string, private clientSecret: string) {}
  async getAuthHeaders() {
    // OAuth token logic
    return { Authorization: `Bearer ${this.token}` };
  }
}

// 3. Factory function with discriminated union
export function createAuthStrategy(
  config: AuthConfig,
  instanceUrl: string
): AuthStrategy {
  switch (config.type) {
    case 'basic':
      return new BasicAuthStrategy(config.username, config.password);
    case 'oauth':
      return new OAuthStrategy(config.client_id, config.client_secret);
    case 'token':
      return new TokenAuthStrategy(config.token);
    default:
      const exhaustiveCheck: never = config;
      throw new Error(`Unsupported auth type: ${(exhaustiveCheck as any).type}`);
  }
}

// 4. Usage
const strategy = createAuthStrategy(config.auth, instanceUrl);
const headers = await strategy.getAuthHeaders();

// ❌ AVOID: Conditional logic everywhere
function getAuthHeaders(config: AuthConfig) {
  if (config.type === 'basic') {
    return { Authorization: `Basic ${encode(config.username, config.password)}` };
  } else if (config.type === 'oauth') {
    // OAuth logic inline
  } else if (config.type === 'token') {
    // Token logic inline
  }
}
```

## Benefits

1. **Single Responsibility** - Each strategy class has one job
2. **Open/Closed Principle** - Easy to add new strategies without modifying existing code
3. **Easy to test** - Test each strategy in isolation with focused tests
4. **Type safety** - Factory uses discriminated union for compile-time checking
5. **Uniform interface** - Consumers don't need to know which strategy is used

## When to Apply

- Multiple implementations of the same behavior (auth, payments, notifications)
- Behavior selection based on configuration or runtime conditions
- Need to add new implementations without changing existing code
- Want to test each implementation independently

## Factory Function Pattern

```typescript
// Type-safe factory with discriminated union
type Config =
  | { type: 'basic'; username: string; password: string }
  | { type: 'oauth'; clientId: string; clientSecret: string }
  | { type: 'token'; token: string };

function createStrategy(config: Config): Strategy {
  switch (config.type) {
    case 'basic': return new BasicStrategy(config.username, config.password);
    case 'oauth': return new OAuthStrategy(config.clientId, config.clientSecret);
    case 'token': return new TokenStrategy(config.token);
    default:
      // Exhaustiveness check - TypeScript will error if case is missing
      const _exhaustive: never = config;
      throw new Error(`Unknown type: ${(_exhaustive as any).type}`);
  }
}
```

## Testing Strategy

```typescript
// Test each strategy independently
describe('BasicAuthStrategy', () => {
  it('should generate correct Basic Auth header', async () => {
    const strategy = new BasicAuthStrategy('user', 'pass');
    const headers = await strategy.getAuthHeaders();
    expect(headers.Authorization).toMatch(/^Basic /);
  });
});

// Test factory selection
describe('createAuthStrategy', () => {
  it('should create BasicAuthStrategy for basic type', () => {
    const config = { type: 'basic', username: 'u', password: 'p' };
    const strategy = createAuthStrategy(config, 'url');
    expect(strategy).toBeInstanceOf(BasicAuthStrategy);
  });
});
```

## Related Patterns

- Command pattern (strategies as commands)
- Adapter pattern (strategies as adapters to external services)
- Plugin architecture (strategies as plugins)
