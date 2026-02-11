# Credential Redaction in Structured Logs

**Confidence:** 0.95
**Domain:** security | logging
**Phase:** 3 | Created: 2026-02-12

## Trigger
When implementing structured JSON logging for systems that handle API credentials, tokens, or sensitive data.

## The Pattern

Use declarative redaction rules at the logging layer, not manual string manipulation:

1. **Centralized configuration** - Define sensitive field names and paths once
2. **Declarative paths** - Use Pino's `redact.paths` with wildcard support (`*.password`, `headers.authorization`)
3. **Consistent censoring** - All redacted values become `[REDACTED]` (or configurable marker)
4. **Wildcard support** - Cover both direct fields (`password`) and nested fields (`user.password`)
5. **Case-sensitive headers** - Handle both `authorization` and `Authorization` HTTP headers

## Implementation (Pino v9)

From T-1.4.2 (Logger Setup):

```typescript
const logger = pino(
  {
    level: 'info',
    redact: {
      paths: [
        'password',
        '*.password',
        'token',
        '*.token',
        'client_secret',
        '*.client_secret',
        'client_id',
        '*.client_id',
        'authorization',
        '*.authorization',
        'headers.authorization',
        'headers.Authorization',
        'auth',
        '*.auth',
      ],
      censor: '[REDACTED]',
    },
  },
  pino.destination(2), // stderr
);
```

## Key Decisions

1. **Pino's built-in redaction over custom logic** - Framework-provided redaction is more reliable
2. **Comprehensive field coverage** - Include direct, nested, and header variants
3. **stderr only (not stdout)** - MCP uses stdout for JSON-RPC; logs must go to stderr
4. **Single-process correlation IDs** - Simple counter + timestamp suffix sufficient for single-process server
5. **No log rotation in app** - Let container runtime / systemd handle rotation

## Standard Redaction List

For API integration scenarios, always redact:

```
- password, *.password          (user passwords)
- token, *.token                (API tokens, bearer tokens)
- client_secret, *.client_secret (OAuth secrets)
- client_id, *.client_id        (OAuth client IDs in some contexts)
- authorization (header)        (lowercase)
- Authorization (header)        (capitalized)
- auth, *.auth                  (generic auth objects)
```

## Testing Strategy

- Verify redaction with each sensitive field type
- Test nested redaction (`user.password` → `user.[REDACTED]`)
- Test both lowercase and capitalized header variants
- Test that non-sensitive fields are NOT redacted
- Verify output is valid JSON
- Check that child loggers inherit parent redaction rules

## Anti-Patterns to Avoid

❌ **Manual string replacement** - Fragile, easy to miss cases
❌ **Environment variable logging** - Log the value, then strip from logs (too late!)
❌ **Partial redaction** - `***secret123***` looks like it redacts but doesn't fully hide
❌ **Different redaction in different loggers** - Inconsistency leads to leaks
❌ **stdout logging** - Corrupts MCP protocol JSON-RPC stream

## Logging Best Practices

✅ **Log at entry/exit** - Record what operations happened, not sensitive data
✅ **Log errors with context** - Include error codes, retry counts, not passwords
✅ **Child loggers with context** - Inject correlation IDs, user IDs, not tokens
✅ **Separate concerns** - Application logs separate from access logs separate from audit logs

## Related Instincts

- `error-response-sanitization` - Similar pattern for API responses (different format)
- `security-first-defaults` - General security principles
- `structured-json-logging` - Logging fundamentals

## Correlation ID Pattern

For request tracing without UUIDs:
```typescript
const correlationId = `req-${++counter}-${Date.now().toString(36)}`;
```

Simple, deterministic, includes timestamp, and scales well for single-process servers.

## Lessons from Implementation

1. **Redaction is declarative, not imperative** - Let the framework handle filtering
2. **Nested paths require wildcard syntax** - Must cover `*.field` for dynamic paths
3. **Headers need both cases** - `authorization` and `Authorization` are both real-world variants
4. **JSON output is self-describing** - Good for log aggregation systems (ELK, Datadog)
5. **Test credential logging explicitly** - Critical security feature needs comprehensive coverage
6. **Performance is good** - Pino redaction has minimal overhead; no need for conditional logging
