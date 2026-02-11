# MCP Tool Contracts

This document defines all MCP tools exposed by the ServiceNow MCP Bridge, organized by module. Each tool includes its name, description, input schema (Zod), and response format.

> **Note:** For an MCP server, the "API contract" is the set of tools registered with the MCP protocol. There is no REST API exposed by the server itself — it communicates via the MCP protocol (stdio or HTTP transport).

---

## Response Format (All Tools)

All tools return `CallToolResult`:

```typescript
// Success
{
  content: [{ type: 'text', text: JSON.stringify(result) }]
}

// Error
{
  content: [{ type: 'text', text: JSON.stringify({ error: code, message, details? }) }],
  isError: true
}
```

---

## Module: Generic (`generic`)

### `query_records` (read-only, always registered)

**Description:** Query records from any ServiceNow table with filters, field selection, and pagination.

```typescript
{
  table: z.string().describe('ServiceNow table name (e.g., "incident", "kb_knowledge")'),
  query: z.string().optional().describe('Encoded query string (e.g., "active=true^priority=1")'),
  fields: z.string().optional().describe('Comma-separated field names to return'),
  limit: z.number().optional().default(10).describe('Maximum records to return (default: 10)'),
  offset: z.number().optional().default(0).describe('Number of records to skip for pagination'),
  order_by: z.string().optional().describe('Field to sort by (prefix with - for descending)'),
  display_value: z.enum(['true', 'false', 'all']).optional().default('false').describe('Return display values instead of sys_ids')
}
```

### `get_record` (read-only, always registered)

**Description:** Get a single record from any ServiceNow table by sys_id.

```typescript
{
  table: z.string().describe('ServiceNow table name'),
  sys_id: z.string().describe('Record sys_id (32-character hex)'),
  fields: z.string().optional().describe('Comma-separated field names to return'),
  display_value: z.enum(['true', 'false', 'all']).optional().default('false').describe('Return display values')
}
```

### `create_record` (write, requires `generic.allow_write=true`)

**Description:** Create a new record in any ServiceNow table.

```typescript
{
  table: z.string().describe('ServiceNow table name'),
  data: z.record(z.string(), z.unknown()).describe('Field values for the new record')
}
```

### `update_record` (write, requires `generic.allow_write=true`)

**Description:** Update an existing record in any ServiceNow table.

```typescript
{
  table: z.string().describe('ServiceNow table name'),
  sys_id: z.string().describe('Record sys_id to update'),
  data: z.record(z.string(), z.unknown()).describe('Field values to update')
}
```

### `delete_record` (write, requires `generic.allow_write=true`)

**Description:** Delete a record from any ServiceNow table.

```typescript
{
  table: z.string().describe('ServiceNow table name'),
  sys_id: z.string().describe('Record sys_id to delete')
}
```

---

## Module: Knowledge Base (`knowledge`)

### `search_knowledge` (read-only, always registered)

**Description:** Search ServiceNow knowledge articles by keyword, category, or query.

```typescript
{
  query: z.string().describe('Search query or keyword'),
  knowledge_base: z.string().optional().describe('Knowledge base sys_id to search within'),
  category: z.string().optional().describe('Category sys_id to filter by'),
  limit: z.number().optional().default(10).describe('Maximum results to return'),
  fields: z.string().optional().describe('Comma-separated field names to return')
}
```

### `get_article` (read-only, always registered)

**Description:** Get a single knowledge article by sys_id or article number.

```typescript
{
  sys_id: z.string().optional().describe('Article sys_id'),
  number: z.string().optional().describe('Article number (e.g., "KB0010001")'),
  fields: z.string().optional().describe('Comma-separated field names to return')
}
```

### `create_article` (write, requires `knowledge.allow_write=true`)

**Description:** Create a new knowledge article.

```typescript
{
  short_description: z.string().describe('Article title'),
  text: z.string().describe('Article body content (HTML)'),
  knowledge_base: z.string().optional().describe('Knowledge base sys_id'),
  category: z.string().optional().describe('Category sys_id'),
  workflow_state: z.enum(['draft', 'review', 'published']).optional().default('draft').describe('Initial workflow state')
}
```

### `update_article` (write, requires `knowledge.allow_write=true`)

**Description:** Update an existing knowledge article.

```typescript
{
  sys_id: z.string().describe('Article sys_id to update'),
  data: z.record(z.string(), z.unknown()).describe('Field values to update')
}
```

---

## Module: Incident (`incident`)

### `list_incidents` (read-only, always registered)

**Description:** List ServiceNow incidents with filters and pagination.

```typescript
{
  state: z.string().optional().describe('Filter by state (e.g., "new", "in_progress", "resolved")'),
  priority: z.string().optional().describe('Filter by priority (1-5)'),
  assigned_to: z.string().optional().describe('Filter by assigned user sys_id or username'),
  query: z.string().optional().describe('Additional encoded query string'),
  limit: z.number().optional().default(10).describe('Maximum results'),
  offset: z.number().optional().default(0).describe('Pagination offset'),
  fields: z.string().optional().describe('Comma-separated fields to return')
}
```

### `get_incident` (read-only, always registered)

**Description:** Get a single incident by sys_id or incident number.

```typescript
{
  sys_id: z.string().optional().describe('Incident sys_id'),
  number: z.string().optional().describe('Incident number (e.g., "INC0010001")'),
  fields: z.string().optional().describe('Comma-separated fields to return')
}
```

### `create_incident` (write, requires `incident.allow_write=true`)

**Description:** Create a new incident in ServiceNow.

```typescript
{
  short_description: z.string().describe('Incident title'),
  description: z.string().optional().describe('Detailed description'),
  urgency: z.enum(['1', '2', '3']).optional().default('3').describe('Urgency level'),
  impact: z.enum(['1', '2', '3']).optional().default('3').describe('Impact level'),
  category: z.string().optional().describe('Incident category'),
  assignment_group: z.string().optional().describe('Assignment group sys_id'),
  assigned_to: z.string().optional().describe('Assigned user sys_id')
}
```

### `update_incident` (write, requires `incident.allow_write=true`)

**Description:** Update an existing incident.

```typescript
{
  sys_id: z.string().describe('Incident sys_id'),
  data: z.record(z.string(), z.unknown()).describe('Field values to update')
}
```

### `resolve_incident` (write, requires `incident.allow_write=true`)

**Description:** Resolve an incident with resolution details.

```typescript
{
  sys_id: z.string().describe('Incident sys_id'),
  close_code: z.string().describe('Resolution code'),
  close_notes: z.string().describe('Resolution notes'),
  assigned_to: z.string().optional().describe('Resolver sys_id')
}
```

### `add_incident_comment` (write, requires `incident.allow_write=true`)

**Description:** Add a work note or comment to an incident.

```typescript
{
  sys_id: z.string().describe('Incident sys_id'),
  comment: z.string().describe('Comment text'),
  type: z.enum(['work_notes', 'comments']).optional().default('work_notes').describe('Comment type')
}
```

---

## Module: Change (`change`)

### `list_changes` (read-only)

```typescript
{
  type: z.string().optional().describe('Change type (normal, standard, emergency)'),
  state: z.string().optional().describe('Change state'),
  query: z.string().optional().describe('Encoded query string'),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
  fields: z.string().optional()
}
```

### `get_change` (read-only)

```typescript
{
  sys_id: z.string().optional(),
  number: z.string().optional(),
  fields: z.string().optional()
}
```

### `create_change` (write, requires `change.allow_write=true`)

```typescript
{
  short_description: z.string().describe('Change request title'),
  description: z.string().optional(),
  type: z.enum(['normal', 'standard', 'emergency']).optional().default('normal'),
  category: z.string().optional(),
  assignment_group: z.string().optional(),
  start_date: z.string().optional().describe('Planned start date (ISO 8601)'),
  end_date: z.string().optional().describe('Planned end date (ISO 8601)')
}
```

### `update_change` (write, requires `change.allow_write=true`)

```typescript
{
  sys_id: z.string(),
  data: z.record(z.string(), z.unknown())
}
```

### `approve_change` (write, requires `change.allow_write=true`)

```typescript
{
  sys_id: z.string().describe('Change request sys_id'),
  approval_status: z.enum(['approved', 'rejected']),
  comments: z.string().optional()
}
```

### `add_change_task` (write, requires `change.allow_write=true`)

```typescript
{
  change_sys_id: z.string().describe('Parent change request sys_id'),
  short_description: z.string(),
  description: z.string().optional(),
  assigned_to: z.string().optional()
}
```

---

## Module: Problem (`problem`)

### `list_problems` (read-only)

```typescript
{
  state: z.string().optional(),
  priority: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
  fields: z.string().optional()
}
```

### `get_problem` (read-only)

```typescript
{
  sys_id: z.string().optional(),
  number: z.string().optional(),
  fields: z.string().optional()
}
```

### `create_problem` (write, requires `problem.allow_write=true`)

```typescript
{
  short_description: z.string(),
  description: z.string().optional(),
  urgency: z.enum(['1', '2', '3']).optional(),
  impact: z.enum(['1', '2', '3']).optional(),
  category: z.string().optional(),
  assignment_group: z.string().optional()
}
```

### `update_problem` (write, requires `problem.allow_write=true`)

```typescript
{
  sys_id: z.string(),
  data: z.record(z.string(), z.unknown())
}
```

### `link_incident_to_problem` (write, requires `problem.allow_write=true`)

```typescript
{
  problem_sys_id: z.string().describe('Problem sys_id'),
  incident_sys_id: z.string().describe('Incident sys_id to link')
}
```

---

## Module: CMDB (`cmdb`)

### `query_cis` (read-only)

```typescript
{
  class: z.string().optional().describe('CI class (e.g., "cmdb_ci_server", "cmdb_ci_app_server")'),
  query: z.string().optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
  fields: z.string().optional()
}
```

### `get_ci` (read-only)

```typescript
{
  sys_id: z.string(),
  class: z.string().optional().describe('CI class for typed response'),
  fields: z.string().optional()
}
```

### `get_ci_relationships` (read-only)

```typescript
{
  sys_id: z.string().describe('CI sys_id to get relationships for'),
  relationship_type: z.string().optional().describe('Filter by relationship type'),
  direction: z.enum(['parent', 'child', 'both']).optional().default('both')
}
```

### `create_ci` (write, requires `cmdb.allow_write=true`)

```typescript
{
  class: z.string().describe('CI class'),
  data: z.record(z.string(), z.unknown()).describe('CI field values')
}
```

### `update_ci` (write, requires `cmdb.allow_write=true`)

```typescript
{
  sys_id: z.string(),
  data: z.record(z.string(), z.unknown())
}
```

---

## Module: Service Catalog (`catalog`)

### `list_catalog_items` (read-only)

```typescript
{
  category: z.string().optional().describe('Catalog category sys_id'),
  query: z.string().optional(),
  limit: z.number().optional().default(10),
  fields: z.string().optional()
}
```

### `get_catalog_item` (read-only)

```typescript
{
  sys_id: z.string().describe('Catalog item sys_id'),
  fields: z.string().optional()
}
```

### `get_request_status` (read-only)

```typescript
{
  request_number: z.string().optional().describe('Request number (e.g., "REQ0010001")'),
  sys_id: z.string().optional().describe('Request sys_id')
}
```

### `submit_catalog_request` (write, requires `catalog.allow_write=true`)

```typescript
{
  catalog_item_sys_id: z.string().describe('Catalog item to request'),
  variables: z.record(z.string(), z.unknown()).optional().describe('Catalog item variable values'),
  requested_for: z.string().optional().describe('User sys_id for whom the request is made')
}
```

---

## Module: User (`user`)

> **Note:** User module is read-only by design (FR-021). No write tools.

### `search_users` (read-only)

```typescript
{
  query: z.string().describe('Search query (name, email, or username)'),
  limit: z.number().optional().default(10),
  fields: z.string().optional()
}
```

### `get_user` (read-only)

```typescript
{
  sys_id: z.string().optional(),
  username: z.string().optional().describe('User username'),
  fields: z.string().optional()
}
```

### `get_user_groups` (read-only)

```typescript
{
  user_sys_id: z.string().describe('User sys_id'),
  fields: z.string().optional()
}
```

### `get_group_members` (read-only)

```typescript
{
  group_sys_id: z.string().describe('Group sys_id'),
  fields: z.string().optional()
}
```

---

## Tool Count Summary

| Module | Read Tools | Write Tools | Total (writes enabled) | Total (writes disabled) |
|--------|-----------|-------------|----------------------|------------------------|
| Generic | 2 | 3 | 5 | 2 |
| Knowledge | 2 | 2 | 4 | 2 |
| Incident | 2 | 4 | 6 | 2 |
| Change | 2 | 4 | 6 | 2 |
| Problem | 2 | 3 | 5 | 2 |
| CMDB | 3 | 2 | 5 | 3 |
| Catalog | 3 | 1 | 4 | 3 |
| User | 4 | 0 | 4 | 4 |
| **Total** | **20** | **19** | **39** | **20** |
