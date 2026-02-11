---
id: native-fetch-over-libraries
trigger: "when choosing HTTP client library for Node.js projects"
confidence: 0.8
domain: "architecture"
source: "session-observation"
phase: "2,3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["fetch", "http", "dependencies", "node.js", "native-api"]
---

# Prefer Native Fetch Over HTTP Libraries in Node.js 20+

## Action

For Node.js projects targeting version 20 or higher, use the **native `fetch` API** with `AbortSignal.timeout()` instead of adding HTTP client libraries like axios or node-fetch.

## Evidence

- Decision made in T-1.1.2 (Configuration system) and applied in T-1.2.1, T-1.2.2
- Zero HTTP dependencies in final implementation
- Native fetch is stable in Node.js 20+ and matches Web standards
- AbortSignal.timeout() provides clean timeout handling without additional code

## Example

```typescript
// ❌ AVOID: Adding unnecessary dependencies
import axios from 'axios';

const response = await axios.get(url, {
  timeout: 30000,
  headers: { 'Authorization': 'Bearer token' }
});

// ✅ PREFER: Native fetch with AbortSignal.timeout()
const response = await fetch(url, {
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json',
  },
  signal: AbortSignal.timeout(30000),
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const data = await response.json();
```

## Benefits

1. **Zero dependencies** - Reduces supply chain risk and bundle size
2. **Web standard API** - Same API in browser and Node.js
3. **Built-in timeout** - `AbortSignal.timeout()` is cleaner than setTimeout
4. **Future-proof** - Follows platform direction (node-fetch is deprecated)

## Trade-offs

- Less ergonomic than axios for some patterns (no automatic JSON parsing, no interceptors)
- Need manual error handling (check response.ok)
- No built-in retry logic (implement separately)

## When to Apply

- New Node.js projects with minimum version >= 20
- Projects prioritizing minimal dependencies
- Security-focused projects (fewer supply chain risks)
- MCP servers and CLI tools

## When to Consider Alternatives

- Need axios interceptors (but consider implementing middleware pattern instead)
- Need extensive retry logic (but consider implementing separate retry layer)
- Supporting Node.js < 18 (use node-fetch, but reconsider minimum version)

## Implementation Pattern

```typescript
// Wrap fetch in a helper for consistent error handling
async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpError(response.status, response.statusText, body);
  }

  return await response.json() as T;
}
```

## Related Decisions

- Custom resilience over library dependencies (rate limiting, retry, circuit breaker)
- Composition over framework (build thin wrappers, not monolithic HTTP clients)
