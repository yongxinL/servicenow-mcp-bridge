---
id: typescript-fetch-json-assertion
trigger: "when parsing JSON from fetch() response in TypeScript"
confidence: 0.9
domain: "code-style"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["typescript", "fetch", "type-assertion", "json"]
---

# Use Type Assertion for fetch().json() in TypeScript

## Action

When calling `response.json()` from fetch, use **type assertion** (`as Type`) instead of **type annotation** (`: Type`) because TypeScript doesn't know the return type at compile time.

## Evidence

- Encountered `TS2322: Type 'unknown' is not assignable to type 'TokenResponse'` when using type annotation
- Pattern observed in T-1.2.1 (OAuth strategy) implementation
- TypeScript's built-in fetch types return `Promise<any>` for json(), which requires runtime type assertion

## Example

```typescript
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ❌ AVOID: Type annotation causes TS error
const data: TokenResponse = await response.json();
// Error: Type 'unknown' is not assignable to type 'TokenResponse'

// ✅ PREFER: Type assertion
const data = await response.json() as TokenResponse;
// Works correctly

// 🔍 BEST: Type assertion with runtime validation (if using Zod)
const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});
const data = tokenResponseSchema.parse(await response.json());
// Type-safe AND runtime-safe
```

## Why This Happens

- `response.json()` returns `Promise<any>` in TypeScript's lib.dom.d.ts
- Type annotations enforce the type at assignment, but `any` → `Type` fails in strict mode
- Type assertions tell TypeScript "trust me, this is the type"

## When to Apply

- Parsing JSON from fetch() responses
- Working with any external API that returns JSON
- When you know the expected shape but TypeScript can't infer it

## Safety Note

Type assertions bypass TypeScript's type checking. For production code:
1. Add runtime validation (Zod, io-ts, etc.)
2. Check response.ok before parsing
3. Validate required fields exist before use

## Related Patterns

- Use Zod schemas for APIs with complex response shapes
- Check `data.access_token` existence before using (defensive programming)
