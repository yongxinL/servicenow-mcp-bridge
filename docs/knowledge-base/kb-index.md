# Knowledge Base Index

**Version:** 1.0
**Last Updated:** [Date of first entry]
**Purpose:** Central index of organizational learning across all projects

> **Usage:** This index provides quick access to failures, patterns, and decisions captured during development. Load this file instead of reading all KB entries for token efficiency.

---

## Index Summary

| Category | Count | Last Updated |
|----------|-------|--------------|
| Failures | 0 | - |
| Patterns | 0 | - |
| Decisions | 0 | - |
| Instincts | 17 | 2026-02-12 |
| **Total** | **17** | 2026-02-12 |

---

## Instincts Index (Continuous Learning v2.0)

### centralized-tool-registry-pattern (confidence: 0.9)
**Trigger:** "when implementing plugin system where plugins register handlers with a server"
**Domain:** architecture | **Phase:** 3 | **Created:** 2026-02-12

When multiple plugins need to register handlers for the same method, use centralized aggregation. Plugins return handler definitions, registry collects and registers once. Prevents handler conflicts.

**File:** `instincts/personal/centralized-tool-registry-pattern.md`
**Tags:** architecture, plugins, registry, handler-routing, mcp

### registration-time-authorization (confidence: 0.9)
**Trigger:** "when implementing authorization for API endpoints or tool access"
**Domain:** security, architecture | **Phase:** 2,3 | **Created:** 2026-02-12

Control access by registering only the tools/capabilities that should be accessible, rather than registering everything and checking at runtime. If a tool doesn't exist, it can't be called.

**File:** `instincts/personal/registration-time-authorization.md`
**Tags:** security, authorization, capability-based, tools, api-design

### resilient-component-initialization (confidence: 0.9)
**Trigger:** "when initializing multiple independent components at startup"
**Domain:** architecture | **Phase:** 3 | **Created:** 2026-02-12

Catch and log errors for individual component failures but continue initializing remaining components. Don't let one broken component prevent the entire system from starting.

**File:** `instincts/personal/resilient-component-initialization.md`
**Tags:** error-handling, initialization, resilience, startup, modules

### plugin-architecture-with-static-registry (confidence: 0.85)
**Trigger:** "when implementing plugin/module system with runtime registration"
**Domain:** architecture | **Phase:** 2,3 | **Created:** 2026-02-12

Use a static array of plugins as the single source of truth. Avoid dynamic file system scanning. Adding a plugin requires only adding it to the array.

**File:** `instincts/personal/plugin-architecture-with-static-registry.md`
**Tags:** architecture, plugins, registry, extensibility, modules

### credential-redaction-in-logs (confidence: 0.95)
**Trigger:** "when implementing structured JSON logging for systems with credentials"
**Domain:** security, logging | **Phase:** 3 | **Created:** 2026-02-12

Use Pino's declarative `redact.paths` configuration to redact sensitive fields in logs. Cover passwords, tokens, client secrets, and both cases of authorization headers.

**File:** `instincts/personal/credential-redaction-in-logs.md`
**Tags:** logging, security, pino, credential-redaction, json

### error-response-sanitization (confidence: 0.95)
**Trigger:** "when parsing and returning error responses from external APIs"
**Domain:** security, error-handling | **Phase:** 3 | **Created:** 2026-02-12

Parse structured errors, strip sensitive patterns (stack traces, file paths, credentials), truncate long bodies, and normalize to API response format.

**File:** `instincts/personal/error-response-sanitization.md`
**Tags:** error-handling, security, api-integration, sanitization

### time-injection-pattern (confidence: 0.9)
**Trigger:** "when implementing time-based logic (delays, timeouts, expiry)"
**Domain:** testing | **Phase:** 3 | **Created:** 2026-02-12

Inject time via constructor parameter (now: () => number = Date.now) for instant, deterministic testing without real delays.

**File:** `instincts/personal/time-injection-pattern.md`
**Tags:** testing, time, dependency-injection, testability, fake-timers

### config-gated-features (confidence: 0.8)
**Trigger:** "when implementing complex or surprising features"
**Domain:** architecture | **Phase:** 2,3 | **Created:** 2026-02-12

Complex features (circuit breakers, aggressive caching) should be disabled by default and require explicit opt-in via configuration.

**File:** `instincts/personal/config-gated-features.md`
**Tags:** configuration, feature-flags, opt-in, defaults, circuit-breaker

### error-classification-hierarchy (confidence: 0.9)
**Trigger:** "when implementing error handling with different strategies (retry, circuit breaker)"
**Domain:** architecture | **Phase:** 3 | **Created:** 2026-02-12

Establish clear error classification: transient (429, 503), server failures (5xx, network), client errors (4xx). Different handling for each class.

**File:** `instincts/personal/error-classification-hierarchy.md`
**Tags:** error-handling, http, retry, circuit-breaker, classification

### state-machine-testing-strategy (confidence: 0.8)
**Trigger:** "when implementing state machines (circuit breaker, connection pools, workflows)"
**Domain:** testing | **Phase:** 3 | **Created:** 2026-02-12

Test state machines with individual transitions AND complete cycles. Ensures both correctness and end-to-end behavior.

**File:** `instincts/personal/state-machine-testing-strategy.md`
**Tags:** testing, state-machine, circuit-breaker, transitions, coverage

### vitest-fake-timers-concurrency (confidence: 0.8)
**Trigger:** "when testing concurrent async operations with vitest fake timers"
**Domain:** testing | **Phase:** 3 | **Created:** 2026-02-12

Use real timers instead of fake timers when testing concurrent async operations. Fake timers can cause tests to hang because setTimeout/Promise timing doesn't advance properly.

**File:** `instincts/personal/vitest-fake-timers-concurrency.md`
**Tags:** vitest, testing, async, fake-timers, concurrency

### typescript-fetch-json-assertion (confidence: 0.9)
**Trigger:** "when parsing JSON from fetch() response in TypeScript"
**Domain:** code-style | **Phase:** 3 | **Created:** 2026-02-12

Use type assertion (`as Type`) instead of type annotation (`: Type`) for `response.json()` because TypeScript returns `Promise<any>`.

**File:** `instincts/personal/typescript-fetch-json-assertion.md`
**Tags:** typescript, fetch, type-assertion, json

### native-fetch-over-libraries (confidence: 0.8)
**Trigger:** "when choosing HTTP client library for Node.js projects"
**Domain:** architecture | **Phase:** 2,3 | **Created:** 2026-02-12

Prefer native fetch API with AbortSignal.timeout() over axios/node-fetch for Node.js 20+ projects. Zero dependencies, Web standard, future-proof.

**File:** `instincts/personal/native-fetch-over-libraries.md`
**Tags:** fetch, http, dependencies, node.js, native-api

### promise-lock-pattern (confidence: 0.9)
**Trigger:** "when implementing token refresh or preventing concurrent async operations"
**Domain:** code-style | **Phase:** 3 | **Created:** 2026-02-12

Use promise lock pattern to prevent concurrent operations: store the ongoing promise and return it to subsequent callers.

**File:** `instincts/personal/promise-lock-pattern.md`
**Tags:** async, concurrency, oauth, token-refresh, promise, lock

### test-organization-by-concern (confidence: 0.7)
**Trigger:** "when organizing unit tests for a complex module"
**Domain:** testing | **Phase:** 3 | **Created:** 2026-02-12

Organize tests into separate files by concern (url-construction, error-handling) rather than one monolithic test file per source file.

**File:** `instincts/personal/test-organization-by-concern.md`
**Tags:** testing, organization, maintainability, vitest

### strategy-pattern-with-factory (confidence: 0.8)
**Trigger:** "when implementing pluggable behavior with multiple implementations"
**Domain:** architecture | **Phase:** 2,3 | **Created:** 2026-02-12

Use Strategy pattern with factory function for type-safe selection of implementations (auth methods, payment providers, etc.).

**File:** `instincts/personal/strategy-pattern-with-factory.md`
**Tags:** design-patterns, strategy-pattern, factory, typescript, extensibility

### selective-env-override (confidence: 0.8)
**Trigger:** "when implementing multi-source configuration with environment variable overrides"
**Domain:** code-style | **Phase:** 3 | **Created:** 2026-02-11

Only include fields in environment config if explicitly set. Prevents default values from overwriting config file values.

**File:** `instincts/personal/selective-env-override.md`
**Tags:** configuration, environment-variables, merge-strategy, precedence, typescript

---

## Failures Index

_No failure entries yet. Use `/kb add failure` to create your first entry._

---

## Patterns Index

_No pattern entries yet. Use `/kb add pattern` to create your first entry._

---

## Decisions Index

_No decision entries yet. Use `/kb add decision` to create your first entry._

---

## How to Use

### Adding Entries

```bash
# Add a failure entry
/kb add failure

# Add a pattern entry
/kb add pattern

# Add a decision entry
/kb add decision
```

### Searching Entries

```bash
# Search by keyword
/kb search "rate limiting"

# View specific entry
/kb view F001
```

### Updating This Index

After adding KB entries, update this index manually or use "Update KB index" to regenerate counts and summaries.
