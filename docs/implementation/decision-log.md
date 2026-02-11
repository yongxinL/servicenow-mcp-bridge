# Decision Log

## Overview

This log captures all significant technical decisions made during the project lifecycle.

## Format

Each entry should include:
- **Date**: When the decision was made
- **Context**: What problem/situation prompted the decision
- **Decision**: What was decided
- **Rationale**: Why this decision was made
- **Consequences**: Expected impact (positive and negative)
- **Alternatives**: What other options were considered

## Decisions

### 2026-02-11 - MCP SDK v1 API (server.tool) over v2 (registerTool)

**Context:**
MCP TypeScript SDK has both v1 (`server.tool()`) and v2 (`server.registerTool()`) APIs. The v2 API requires `z.object()` wrapping and uses `zod/v4` imports.

**Decision:**
Use v1 `server.tool()` API with Zod v3 schemas for v0.1.0.

**Rationale:**
- Locked specification requires MCP SDK v1.x and Zod v3.x
- v1 API is simpler and widely documented
- v2 migration path is documented and straightforward

**Consequences:**
- Will need migration when v2 becomes minimum
- v1 API is still supported and functional

**Alternatives Considered:**
- Use v2 API now — rejected: would require Zod v4 which conflicts with spec constraint TC-004

### 2026-02-11 - Native fetch over axios/node-fetch

**Context:**
Need HTTP client for ServiceNow REST API calls.

**Decision:**
Use Node.js built-in `fetch` API (stable in Node 20+).

**Rationale:**
- Zero additional dependencies
- Standard web API
- TC-001 requires Node >=20 which has stable fetch
- Reduces supply chain risk

**Consequences:**
- Slightly less ergonomic than axios for some patterns
- No automatic retry/interceptor features (we build our own resilience layer)

**Alternatives Considered:**
- axios — rejected: unnecessary dependency, larger bundle
- node-fetch — rejected: polyfill for built-in, no longer needed

### 2026-02-11 - Custom resilience over library dependencies

**Context:**
Need rate limiting, retry with backoff, and circuit breaker for ServiceNow API calls.

**Decision:**
Implement custom rate limiter, retry handler, and circuit breaker (~150 LOC total) instead of using libraries (bottleneck, p-retry, opossum).

**Rationale:**
- Each implementation is <100 LOC
- Reduces supply chain risk for security-focused project
- Full control over ServiceNow-specific behavior
- Avoids heavyweight dependencies for simple algorithms

**Consequences:**
- Slightly more implementation effort (~10h)
- Must maintain and test custom code

**Alternatives Considered:**
- bottleneck for rate limiting — rejected: overkill for token bucket
- p-retry for retries — rejected: simple exponential backoff is straightforward
- opossum for circuit breaker — rejected: heavy dependency for simple state machine

### 2026-02-12 - Strategy Pattern for Authentication

**Context:**
Need to support three different ServiceNow authentication methods: Basic Auth, OAuth 2.0 Client Credentials, and static Bearer tokens.

**Decision:**
Implement Strategy pattern with a common `AuthStrategy` interface and three concrete implementations (`BasicAuthStrategy`, `OAuthStrategy`, `TokenAuthStrategy`), selected via factory function.

**Rationale:**
- Clean separation of concerns - each auth method is self-contained
- Easy to test in isolation
- Simple to extend with new auth methods in future
- Factory function provides type-safe selection based on config

**Consequences:**
- All strategies use Promise-based `getAuthHeaders()` even though Basic and Token are synchronous - maintains uniform interface for OAuth's async token refresh
- Clear extension point for future auth methods (e.g., SAML, API keys)

**Alternatives Considered:**
- Single auth class with conditional logic - rejected: harder to test, violates Single Responsibility Principle
- Separate factory classes - rejected: over-engineering for simple strategy selection

### 2026-02-12 - OAuth Token Caching with 60-second Refresh Buffer

**Context:**
OAuth access tokens expire after a set duration (typically 1 hour). Need to cache tokens and refresh before expiry to avoid auth failures.

**Decision:**
Cache OAuth token in-memory with automatic refresh when current time + 60 seconds >= expiry time. Use promise lock to prevent concurrent refresh requests.

**Rationale:**
- 60-second buffer prevents race condition where token expires between header generation and API request
- In-memory cache is simple and sufficient (token loss on restart is acceptable)
- Promise lock ensures only one token refresh happens even with concurrent calls
- Native fetch API for token endpoint keeps dependencies minimal

**Consequences:**
- Token is lost on server restart (acceptable: next request will fetch new token)
- Buffer size (60s) is configurable via constructor parameter
- Thread-safe for Node.js single-threaded model

**Alternatives Considered:**
- No caching - rejected: would make a token request on every API call (inefficient)
- Persistent token storage (Redis, file) - rejected: over-engineering for MCP server use case
- Longer buffer (5 minutes) - rejected: wastes token lifetime, 60s is sufficient for typical request latency

---
