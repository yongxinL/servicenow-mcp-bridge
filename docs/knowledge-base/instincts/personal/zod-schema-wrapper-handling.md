# Instinct: Zod Schema Wrapper Handling in JSON Schema Conversion

**ID:** zod-schema-wrapper-handling
**Confidence:** 0.85
**Domain:** typescript, validation
**Phase:** 3 (Implementation)
**Created:** 2026-02-12
**Tags:** zod, json-schema, validation, schema-conversion

## Trigger

When converting Zod schemas to JSON Schema for MCP tool definitions or OpenAPI specs, and the schema uses `.default()` or other wrapper methods.

## Context

Zod schemas can be wrapped with modifiers like `.default()`, `.optional()`, `.nullable()`. When converting to JSON Schema, you need to unwrap these modifiers to access the inner type information.

### Problem

```typescript
const schema = z.object({
  type: z.enum(['work_notes', 'comments']).default('work_notes'),
});

// Naive conversion
const type = zodField instanceof z.ZodEnum; // false! It's a ZodDefault
```

The wrapped schema instance check fails because `zodField` is a `ZodDefault`, not a `ZodEnum`.

## Pattern

**Unwrap Zod schema modifiers to access inner type:**

```typescript
function zodToJsonSchema(schema: z.ZodObject<any>): any {
  const shape = schema._def.shape();
  const properties: any = {};

  for (const [key, value] of Object.entries(shape)) {
    const zodField = value as z.ZodTypeAny;

    let type = 'string';
    let defaultValue: any;
    let enumValues: any[] | undefined;

    // Check base types first
    if (zodField instanceof z.ZodString) {
      type = 'string';
    } else if (zodField instanceof z.ZodEnum) {
      type = 'string';
      enumValues = zodField._def.values;
    }
    // Then check wrapper types
    else if (zodField instanceof z.ZodDefault) {
      // Extract default value
      defaultValue = zodField._def.defaultValue;

      // Unwrap to get inner type
      const innerType = zodField._def.innerType;
      if (innerType instanceof z.ZodEnum) {
        type = 'string';
        enumValues = innerType._def.values;
      }
    }

    properties[key] = { type, description };

    if (enumValues) {
      properties[key].enum = enumValues;
    }

    if (defaultValue !== undefined) {
      properties[key].default =
        typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  }

  return { type: 'object', properties };
}
```

## Key Points

1. **Check wrappers after base types**: Base type checks fail for wrapped schemas
2. **Access inner type via `_def.innerType`**: Zod stores the wrapped schema here
3. **Extract modifier values**: Default values, optionality are in `_def`
4. **Handle function defaults**: Some defaults are functions (e.g., `() => Date.now()`)

## Common Wrappers

| Wrapper | Access Inner Type | Access Metadata |
|---------|------------------|-----------------|
| `.default(value)` | `zodField._def.innerType` | `zodField._def.defaultValue` |
| `.optional()` | `zodField._def.innerType` | Check via `zodField.isOptional()` |
| `.nullable()` | `zodField._def.innerType` | `zodField._def.nullable` |
| `.transform()` | `zodField._def.schema` | `zodField._def.effect` |

## Why This Matters

- **MCP Tool Definitions**: Tools need accurate JSON Schema for parameter validation
- **API Documentation**: OpenAPI generation requires correct type information
- **AI Discoverability**: Enums and defaults help AI assistants understand valid values
- **Runtime Validation**: Incorrect schemas lead to validation failures

## Example Use Case

```typescript
// Zod schema with default enum
const commentSchema = z.object({
  type: z.enum(['work_notes', 'comments']).default('work_notes'),
  text: z.string(),
});

// Converted JSON Schema
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["work_notes", "comments"],
      "default": "work_notes",
      "description": "Comment type: work_notes (internal) or comments (customer-visible)"
    },
    "text": {
      "type": "string",
      "description": "The comment text"
    }
  },
  "required": ["text"]  // type is optional due to default
}
```

## Evidence

- **Task**: T-2.3.1 (Incident Module)
- **File**: `src/modules/incident/index.ts:48-74`
- **Result**: Enum values and defaults correctly appear in MCP tool definitions

## Related Patterns

- **Zod Runtime Validation**: Use Zod's built-in `.parse()` for runtime validation, not manual JSON Schema checks
- **Schema Migration**: When migrating from JSON Schema to Zod, map default and enum correctly

## Anti-Patterns

❌ **Only checking base types**
```typescript
if (zodField instanceof z.ZodEnum) {
  enumValues = zodField._def.values; // Fails for .default(enum)
}
```

❌ **Ignoring default values**
```typescript
// Missing default in JSON Schema means AI thinks field is required
```

✅ **Handle wrappers and extract inner types**
```typescript
if (zodField instanceof z.ZodDefault) {
  const innerType = zodField._def.innerType;
  if (innerType instanceof z.ZodEnum) {
    enumValues = innerType._def.values;
  }
  defaultValue = zodField._def.defaultValue;
}
```

## Version History

- **2026-02-12**: Initial pattern captured from T-2.3.1 implementation
