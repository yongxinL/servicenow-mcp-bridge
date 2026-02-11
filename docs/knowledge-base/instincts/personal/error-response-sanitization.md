# Error Response Sanitization for API Integration

**Confidence:** 0.95
**Domain:** security | error-handling
**Phase:** 3 | Created: 2026-02-12

## Trigger
When building API integrations that parse and return error responses from external services.

## The Pattern

Always sanitize error responses before returning them to clients:

1. **Parse structured errors** - Extract user-friendly messages from service JSON response bodies
2. **Strip sensitive patterns** - Remove stack traces, file paths, credentials, tokens
3. **Truncate long bodies** - Limit output to prevent information leakage via verbose errors
4. **Use regex patterns** - Match sensitive patterns (`at ` for traces, `/opt/` for internal paths, `password`, `token`)
5. **Normalize to MCP format** - Return as structured CallToolResult with error codes and messages

## Implementations

### ServiceNow Error Parser
From T-1.4.1 (Error Normalizer):

```typescript
function sanitizeErrorBody(body: string): string | undefined {
  if (!body || body.length === 0) return undefined;

  // Try parsing as JSON first (ServiceNow uses structured errors)
  try {
    const parsed = JSON.parse(body);
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.error?.detail) return parsed.error.detail;
  } catch {
    // Not JSON — fall through to raw body handling
  }

  const truncated = body.substring(0, 500);

  // Detect and strip sensitive patterns
  const sensitivePatterns = [
    /at .+:\d+:\d+/, // Stack traces
    /\/opt\//, /\/usr\//, /\\node_modules\\/, // File paths
    /password/i, /token/i, /secret/i, // Credentials
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(truncated)) return undefined;
  }

  return truncated;
}
```

## Key Decisions

1. **Declarative over Imperative** - Use regex patterns for detection, not manual string parsing
2. **Fail-safe to undefined** - If content looks suspicious, don't return it (better safe than sorry)
3. **JSON parsing first** - External APIs often return structured errors; parse and extract the message
4. **Truncation before sanitization** - Limit size first to avoid processing huge error bodies
5. **No stack traces to clients** - Stack traces go to logs only, never to API responses

## Testing Strategy

- Test each status code (400, 401, 403, 404, 429, 500, 502, 503)
- Test with ServiceNow JSON error format
- Test with malformed/non-JSON errors
- Test that stack traces are stripped (verify "at " pattern removal)
- Test that internal paths are stripped (`/opt/`, `\node_modules\`)
- Test that credentials are not exposed
- Test truncation of very long bodies

## Anti-Patterns to Avoid

❌ **Returning raw error bodies**: `throw new Error(error.body)` — Exposes internal details
❌ **Including exception messages**: `return error.message` — May contain sensitive context
❌ **No validation**: Not checking for patterns — Credentials leak through
❌ **Logging full responses**: Logs will contain sensitive data (use redaction instead, see T-1.4.2)

## Related Instincts

- `credential-redaction-in-logs` - Similar pattern for logging, different implementation
- `error-classification-hierarchy` - How to map HTTP status to error codes
- `security-first-defaults` - General security principles

## Lessons from Implementation

1. **Pattern matching is fragile** - Need comprehensive patterns to catch all sensitive content
2. **Test with real service responses** - Mock errors might not reveal all leaks
3. **Document sensitive fields** - Keep an updated list of fields that should never leak
4. **Separate error contexts** - Internal errors (logs) vs client-facing errors (API responses)
5. **Defensive programming** - When in doubt about content, don't return it
