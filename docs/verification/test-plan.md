# Test Plan

## Meta

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Phase | 2 |
| Created | 2026-02-11 |
| Test Framework | vitest |
| Coverage Tool | vitest (v8 provider) |

---

## Quality Thresholds

| Metric | Minimum (Blocking) | Target | Verification |
|--------|-------------------|--------|--------------|
| Line Coverage | 70% | 85% | `vitest --coverage` |
| Branch Coverage | 60% | 75% | `vitest --coverage` |
| Security Issues (Critical/High) | 0 | 0 | npm audit |
| AC Pass Rate | 100% | 100% | Test suite |

---

## Test Strategy

### Unit Tests (`tests/unit/`)

Unit tests validate individual components in isolation using mocks for external dependencies (ServiceNow API, MCP protocol).

| Component | Test File | Key Scenarios |
|-----------|-----------|---------------|
| Configuration | `config/*.test.ts` | 3-tier precedence, Zod validation, fail-fast on missing fields, default values |
| Basic Auth | `auth/basic.test.ts` | Header construction, base64 encoding |
| OAuth Auth | `auth/oauth.test.ts` | Token request, caching, auto-refresh before expiry, error handling |
| Token Auth | `auth/token.test.ts` | Bearer header construction |
| HTTP Client | `client/*.test.ts` | URL construction (Table API, Aggregate API), query param serialization, request/response handling |
| Rate Limiter | `resilience/rate-limiter.test.ts` | Token consumption, burst handling, throttle delay, refill rate |
| Retry Handler | `resilience/retry.test.ts` | Exponential backoff, jitter, retryable error detection (429, 503), Retry-After header, max retries |
| Circuit Breaker | `resilience/circuit-breaker.test.ts` | State transitions (CLOSED→OPEN→HALF_OPEN→CLOSED), threshold, reset timeout, fail-fast |
| Error Normalizer | `errors/*.test.ts` | HTTP 400→VALIDATION_ERROR, 401→AUTHENTICATION_ERROR, 403→AUTHORIZATION_ERROR, 404→NOT_FOUND, 429→RATE_LIMITED, 500→SERVER_ERROR, network→NETWORK_ERROR, empty results |
| Logger | `logging/*.test.ts` | Stderr output, JSON structure, child loggers, correlation ID, credential redaction |
| Module Registry | `modules/registry.test.ts` | Feature flag gating, write tool conditional registration, module loading |

### Integration Tests (`tests/integration/`)

Integration tests validate end-to-end MCP protocol flows using in-memory MCP transport and mock HTTP responses.

| Test Suite | Test File | Key Scenarios |
|-----------|-----------|---------------|
| Server Startup | `server.test.ts` | MCP initialize handshake, server name/version, tool listing |
| Tool Registration | `tool-registration.test.ts` | Enabled modules register tools, disabled modules don't, write flags control write tool registration |
| Knowledge Module | `modules/knowledge.test.ts` | search_knowledge with mock results, get_article by sys_id, create_article (write enabled), empty results |
| Incident Module | `modules/incident.test.ts` | list_incidents with filters, get_incident, create_incident, resolve_incident |
| Generic Module | `modules/generic.test.ts` | query_records with table/query/fields, get_record by sys_id, write operations |
| Error Handling | `error-scenarios.test.ts` | Invalid credentials (401), forbidden (403), not found (404), bad request (400), network timeout, empty results |
| Config Precedence | `config-precedence.test.ts` | Env var overrides config file, missing required fields fail |

### Mock Infrastructure

```
tests/
├── helpers/
│   ├── mock-servicenow.ts      # Mock HTTP server for ServiceNow API responses
│   ├── mock-responses.ts       # Canned ServiceNow response fixtures
│   └── test-config.ts          # Test configuration factories
```

---

## Acceptance Criteria → Test Mapping

| AC ID | Priority | Test Type | Test Location | Automated |
|-------|----------|-----------|---------------|-----------|
| AC-001 | High | Integration | `server.test.ts` | Yes |
| AC-002 | High | Integration | `tool-registration.test.ts` | Yes |
| AC-003 | High | Integration | `tool-registration.test.ts` | Yes |
| AC-004 | High | Integration | `modules/knowledge.test.ts` | Yes |
| AC-005 | High | Integration | `modules/knowledge.test.ts` | Yes |
| AC-006 | High | Integration | `modules/incident.test.ts` | Yes |
| AC-007 | High | Integration | `modules/generic.test.ts` | Yes |
| AC-008 | High | Integration | `tool-registration.test.ts` | Yes |
| AC-009 | High | Unit | `errors/*.test.ts` | Yes |
| AC-010 | High | Unit | `errors/*.test.ts` | Yes |
| AC-011 | High | Unit | `errors/*.test.ts` | Yes |
| AC-012 | High | Unit | `errors/*.test.ts` | Yes |
| AC-013 | High | Unit | `resilience/retry.test.ts` | Yes |
| AC-014 | High | Unit | `auth/oauth.test.ts` | Yes |
| AC-015 | High | Unit | `config/*.test.ts` | Yes |
| AC-016 | High | Unit | `config/*.test.ts` | Yes |
| AC-017 | Medium | Unit | `resilience/circuit-breaker.test.ts` | Yes |
| AC-018 | Medium | Unit | `resilience/rate-limiter.test.ts` | Yes |
| AC-019 | Medium | Unit | `logging/*.test.ts` | Yes |
| AC-020 | High | Unit | `errors/*.test.ts` | Yes |
| AC-021 | Medium | Manual | Code review | No |

**Coverage:** 20/21 ACs automated (95%); 1 manual review (AC-021: extensibility guarantee)

---

## Test Execution

```bash
# Run all tests
npx vitest

# Run with coverage
npx vitest --coverage

# Run unit tests only
npx vitest tests/unit

# Run integration tests only
npx vitest tests/integration

# Run specific module tests
npx vitest tests/unit/modules/knowledge
```

---

## Performance Testing (Future — Post v0.1.0)

| Scenario | Target | Tool |
|----------|--------|------|
| Server startup time | <3s | Custom timing script |
| Tool call processing (excluding ServiceNow) | P95 <100ms | vitest benchmarks |
| Concurrent tool calls | No deadlocks | Load test script |
