---
id: selective-env-override
trigger: "when implementing multi-source configuration with environment variable overrides"
confidence: 0.8
domain: "code-style"
source: "session-observation"
phase: "3"
created: "2026-02-11"
last_reinforced: "2026-02-11"
---

# Selective Environment Variable Override

## Action

When implementing configuration systems with multiple sources (defaults → file → env), only include fields in the environment config object if they are explicitly set in environment variables. Do not populate with default values during env extraction.

## Evidence

- Discovered through test failure in T-1.1.2 (Configuration System)
- Test expected: env overrides only explicitly set fields
- Initial implementation incorrectly populated all fields with defaults
- Fix validated by 21 passing tests with 100% coverage
- Pattern applied consistently across 4 config sections (servicenow, modules, rate_limit, circuit_breaker)

## Problem Pattern (Avoid)

```typescript
// ❌ WRONG: Always populates timeout with default, overwriting file value
if (env.SERVICENOW_INSTANCE) {
  config.servicenow = {
    instance: env.SERVICENOW_INSTANCE,
    timeout: parseNumber(env.SERVICENOW_TIMEOUT, defaults.servicenow.timeout),
    max_retries: parseNumber(env.SERVICENOW_MAX_RETRIES, defaults.servicenow.max_retries),
  };
}
```

**Why this fails:**
- When `SERVICENOW_INSTANCE` is set but `SERVICENOW_TIMEOUT` is not
- The timeout gets set to default value (30000)
- This overwrites any timeout value from config file
- Breaks 3-tier precedence: env should only override what's explicitly set

## Solution Pattern (Prefer)

```typescript
// ✅ CORRECT: Only includes explicitly set env vars
const servicenow: Record<string, any> = {};
if (env.SERVICENOW_INSTANCE !== undefined) {
  servicenow.instance = env.SERVICENOW_INSTANCE;
}
if (env.SERVICENOW_TIMEOUT !== undefined) {
  servicenow.timeout = parseNumber(env.SERVICENOW_TIMEOUT, defaults.servicenow.timeout);
}
if (env.SERVICENOW_MAX_RETRIES !== undefined) {
  servicenow.max_retries = parseNumber(env.SERVICENOW_MAX_RETRIES, defaults.servicenow.max_retries);
}
if (Object.keys(servicenow).length > 0) {
  config.servicenow = servicenow;
}
```

**Why this works:**
- Each field is independently checked for presence
- `!== undefined` distinguishes "not set" from "empty string"
- Only explicitly set env vars make it into the config object
- Deep merge function preserves file/default values for unset fields
- True 3-tier precedence achieved

## Related Context

- **Task:** T-1.1.2 (Configuration System)
- **Test Case:** "should allow environment variables to override config file"
- **Pattern Type:** Configuration merge strategy
- **Similar Instincts:** None yet (first learned pattern)

## Applicability

Apply this pattern when:
- Building configuration systems with multiple sources
- Implementing environment variable overrides
- Using deep merge strategies for config objects
- Supporting partial config updates
- Discriminated unions need field-level overrides

## Tags

`configuration` `environment-variables` `merge-strategy` `precedence` `typescript` `zod`
