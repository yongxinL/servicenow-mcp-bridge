# Instinct: Semantic Parameter Mapping for Domain APIs

**ID:** semantic-parameter-mapping
**Confidence:** 0.85
**Domain:** api-design, ai-integration
**Phase:** 2, 3 (Planning, Implementation)
**Created:** 2026-02-12
**Tags:** api-design, semantic-mapping, ai-discoverability, domain-specific

## Trigger

When designing API interfaces for AI assistants that interact with domain-specific systems that use internal codes or enums.

## Context

ServiceNow (and similar enterprise systems) use numeric codes internally for field values:
- State: 1=New, 2=In Progress, 6=Resolved
- Priority: 1=Critical, 2=High, 3=Moderate

AI assistants and human users naturally think in semantic terms ("high priority", "resolved state"), not numeric codes.

## Pattern

**Provide semantic parameter mapping in your API layer:**

1. **Accept both semantic and numeric values** in tool parameters
2. **Map semantic values to system codes** before API calls
3. **Use descriptive Zod schemas** with semantic examples
4. **Return display values** (human-readable) in responses when possible

### Implementation

```typescript
// Define semantic mappings
const PRIORITY_MAP: Record<string, string> = {
  critical: '1',
  high: '2',
  moderate: '3',
  low: '4',
};

// Resolver function (accepts both semantic and numeric)
function resolveValue(
  value: string | undefined,
  map: Record<string, string>,
): string | undefined {
  if (!value) return undefined;
  // If already numeric, return as-is
  if (/^\d+$/.test(value)) return value;
  // Map semantic value to numeric
  return map[value.toLowerCase()] || value;
}

// In tool handler
const priorityValue = resolveValue(params.priority, PRIORITY_MAP);
if (priorityValue) fields.priority = priorityValue;
```

### Schema Design

```typescript
priority: z
  .string()
  .optional()
  .describe(
    'Priority level: "critical", "high", "moderate", "low", or numeric value (1-4)',
  )
```

This tells the AI assistant:
- What semantic values are accepted
- That numeric values also work (for power users)
- The field is optional

## Why This Works

1. **AI Discoverability**: AI assistants can read the schema descriptions and use natural language values
2. **Human-Friendly**: Users don't need to memorize numeric codes
3. **Power User Support**: Numeric codes still work for advanced use cases
4. **Backward Compatible**: Existing numeric values continue to work
5. **Error Tolerant**: Handles case variations and whitespace

## Constraints

- **Case insensitivity**: Normalize to lowercase for matching
- **Validation**: Unknown semantic values should pass through (might be valid codes you don't know about)
- **Documentation**: Always document both semantic and numeric values in schema descriptions

## Related Patterns

- **Display Value Returns**: Use `sysparm_display_value=true` to return human-readable values in responses (see servicenow-encoded-query-patterns)
- **Enum Validation**: Consider strict enum validation when the value set is fixed and known

## Evidence

- **Task**: T-2.3.1 (Incident Module)
- **Files**: `src/modules/incident/tools.ts`
- **Result**: AI assistants can naturally use "high priority" instead of "priority=2"

## Anti-Patterns

❌ **Numeric-only parameters**
```typescript
priority: z.string().describe('Priority code (1-5)')
```
Forces users to look up codes.

❌ **Strict enums without numeric fallback**
```typescript
priority: z.enum(['critical', 'high', 'moderate', 'low'])
```
Breaks if user wants to use numeric codes.

✅ **Semantic with numeric fallback**
```typescript
priority: z.string().optional().describe(
  'Priority: "critical", "high", "moderate", "low", or numeric (1-4)'
)
```

## Version History

- **2026-02-12**: Initial pattern captured from T-2.3.1 implementation
