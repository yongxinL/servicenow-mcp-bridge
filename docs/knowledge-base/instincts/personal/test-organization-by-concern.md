---
id: test-organization-by-concern
trigger: "when organizing unit tests for a complex module"
confidence: 0.7
domain: "testing"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["testing", "organization", "maintainability", "vitest"]
---

# Organize Tests by Concern, Not by Source File

## Action

For modules with multiple concerns (URL construction, error handling, authentication, etc.), organize tests into **separate files by concern** rather than one test file per source file.

## Evidence

- Applied in T-1.2.2 (HTTP Client) implementation
- Created 4 test files: query-builder.test.ts, url-construction.test.ts, http-methods.test.ts, error-handling.test.ts
- Each test file is focused and easy to navigate (12-20 tests each)
- Makes test failures easier to locate and understand

## Example

```
// ❌ AVOID: One monolithic test file
tests/client/
  client.test.ts (150+ tests, 800+ lines)

// ✅ PREFER: Organized by concern
tests/client/
  query-builder.test.ts      (12 tests - parameter serialization)
  url-construction.test.ts   (12 tests - URL building logic)
  http-methods.test.ts       (16 tests - GET, POST, PATCH, DELETE)
  error-handling.test.ts     (20 tests - error cases, status codes)
```

## Benefits

1. **Easier navigation** - Find relevant tests quickly
2. **Focused test suites** - Each file tests one aspect thoroughly
3. **Better test names** - Less repetition in describe blocks
4. **Parallel test execution** - Vitest can run files in parallel
5. **Clearer failure messages** - File name indicates what broke

## When to Apply

- Module has 30+ tests
- Module has multiple distinct concerns (URL building, error handling, authentication)
- Tests start feeling "cramped" or hard to navigate
- Test file exceeds 400 lines

## When to Keep Single File

- Simple modules with < 20 tests
- Single responsibility modules (e.g., query-builder.ts → query-builder.test.ts)
- Tightly coupled logic that benefits from shared test setup

## Structure Example

```typescript
// tests/client/error-handling.test.ts
describe('ServiceNowClient - Error Handling', () => {
  describe('ServiceNowHttpError', () => {
    it('should include status code in error', ...);
    it('should include response body in error', ...);
  });

  describe('HTTP Error Status Codes', () => {
    it('should handle 401 Unauthorized', ...);
    it('should handle 404 Not Found', ...);
  });
});

// tests/client/http-methods.test.ts
describe('ServiceNowClient - HTTP Methods', () => {
  describe('GET method', () => {
    it('should make GET request with correct headers', ...);
    it('should return array of results', ...);
  });

  describe('POST method', () => {
    it('should make POST request with body', ...);
  });
});
```

## Related Patterns

- Group related tests with nested `describe()` blocks
- Use consistent naming: `<module>-<concern>.test.ts`
- Share test fixtures across concern-specific test files
