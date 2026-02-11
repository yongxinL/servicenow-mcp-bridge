---
id: servicenow-encoded-query-patterns
trigger: "when implementing ServiceNow Table API queries with search or filtering"
confidence: 0.85
domain: "api-integration"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["servicenow", "api", "query", "search", "like", "filter"]
---

# ServiceNow Encoded Query Patterns

## Action

When building ServiceNow Table API queries, use encoded query syntax for filtering and searching. Use `LIKE` operator for substring search, `^` for AND, `^OR` for OR, and standard operators (=, !=, <, >) for exact matching. Always URL-encode the final query string.

## Evidence

- Knowledge module (T-2.2.1) uses search query: `short_descriptionLIKE{term}^ORtextLIKE{term}`
- Searches both title and body fields for knowledge articles
- Additional filter for published state: `^workflow_state=published`
- Works with ServiceNow's sysparm_query parameter
- Common pattern across all ServiceNow REST API integrations

## Example

```typescript
// ✅ PREFER: Encoded query syntax

// Substring search (LIKE)
const searchQuery = `short_descriptionLIKE${searchTerm}`;
// Result: Finds articles with "searchTerm" anywhere in short_description

// Multi-field search with OR
const multiFieldSearch = `short_descriptionLIKE${term}^ORtextLIKE${term}`;
// Result: Searches both fields, returns if either matches

// Combining conditions with AND
const filteredSearch = `short_descriptionLIKE${term}^workflow_state=published`;
// Result: Matches term AND published state

// Complex query with AND + OR
const complexQuery = `priorityIN1,2^ORurgency=1^state!=6`;
// Result: (priority is 1 or 2) OR (urgency is 1) AND (state is not 6)

// ❌ AVOID: Building SQL-like queries (not supported)
const sqlQuery = `SELECT * FROM kb_knowledge WHERE short_description LIKE '%${term}%'`;
// ServiceNow uses its own encoded query syntax, not SQL
```

## Common Operators

| Operator | Syntax | Example | Description |
|----------|--------|---------|-------------|
| **Equals** | `=` | `state=1` | Exact match |
| **Not equals** | `!=` | `state!=6` | Not equal |
| **Contains** | `LIKE` | `nameLIKEjohn` | Substring search (case-insensitive) |
| **Starts with** | `STARTSWITH` | `numberSTARTSWITHINC` | Prefix match |
| **Ends with** | `ENDSWITH` | `emailENDSWITH@company.com` | Suffix match |
| **In list** | `IN` | `priorityIN1,2,3` | Value in comma-separated list |
| **Greater than** | `>` | `priority>3` | Numeric/date comparison |
| **Less than** | `<` | `priority<2` | Numeric/date comparison |
| **AND** | `^` | `state=1^priority=2` | Logical AND |
| **OR** | `^OR` | `priority=1^ORpriority=2` | Logical OR |
| **NOT** | `^NQ` | `state=1^NQpriority=5` | Logical NOT |

## Search Patterns

### Full-Text Search (Multiple Fields)
```typescript
// Search across title and body
const query = `titleLIKE${term}^ORdescriptionLIKE${term}^ORbodyLIKE${term}`;

// Add state filter
const publishedQuery = query + '^workflow_state=published';
```

### Status Filtering
```typescript
// Active records only
const activeQuery = `active=true^${otherConditions}`;

// Not closed
const openQuery = `state!=6^state!=7`;

// Specific states
const newOrInProgressQuery = `stateIN1,2,3`;
```

### Date Range Queries
```typescript
// Created in last 7 days
const recentQuery = `sys_created_on>javascript:gs.daysAgo(7)`;

// Updated today
const todayQuery = `sys_updated_on>javascript:gs.beginningOfToday()`;
```

### Priority and Urgency
```typescript
// High priority or high urgency
const urgentQuery = `priority=1^ORurgency=1`;

// Critical (P1 and U1)
const criticalQuery = `priority=1^urgency=1`;
```

## Default Filters for Domain Modules

```typescript
// Knowledge Base: Published articles only by default
const knowledgeDefaults = {
  published_only: true,
  query_suffix: '^workflow_state=published'
};

// Incidents: Active incidents by default
const incidentDefaults = {
  active_only: true,
  query_suffix: '^active=true'
};

// Implementation
function buildQuery(userQuery: string, publishedOnly: boolean): string {
  let query = `short_descriptionLIKE${userQuery}^ORtextLIKE${userQuery}`;
  if (publishedOnly) {
    query += '^workflow_state=published';
  }
  return query;
}
```

## URL Encoding

```typescript
// ❌ AVOID: Passing unencoded query
const url = `${baseUrl}/api/now/table/incident?sysparm_query=${query}`;
// Special characters (^, =, LIKE) will break

// ✅ PREFER: URL encode the query parameter
const queryParams = new URLSearchParams({
  sysparm_query: query
});
const url = `${baseUrl}/api/now/table/incident?${queryParams}`;
// Or let the HTTP client handle encoding
```

## Best Practices

1. **LIKE for user search**: Use `LIKE` operator for user-provided search terms (substring matching)
2. **Default sensible filters**: Filter for published/active/open records by default
3. **Configurable filters**: Provide boolean flags to disable default filters
4. **Multi-field search**: Search across title + description + body for better results
5. **Avoid SQL injection**: Never concatenate user input directly - validate or use parameterized queries
6. **Case-insensitive**: LIKE operator is case-insensitive by default
7. **Performance**: Add indexes on frequently searched fields in ServiceNow

## Common Patterns by Use Case

```typescript
// User-facing search (knowledge, catalog items)
const userSearch = `titleLIKE${term}^ORdescriptionLIKE${term}^active=true`;

// Admin queries (all records including inactive)
const adminQuery = `assignedTo=${userId}`;

// Reports and analytics (date ranges)
const reportQuery = `sys_created_on>=${startDate}^sys_created_on<=${endDate}`;

// Reference field queries (relationships)
const relatedQuery = `assigned_to=${userSysId}^state!=6`;
```

## Related Documentation

- ServiceNow REST API Query Parameters: https://docs.servicenow.com/bundle/latest/page/integrate/inbound-rest/concept/c_TableAPI.html#c_TableAPI
- Encoded Query Builder: Use ServiceNow UI filter builder, copy encoded query
- Testing queries: Test in ServiceNow UI first, then copy encoded query
