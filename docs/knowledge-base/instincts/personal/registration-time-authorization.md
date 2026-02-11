---
id: registration-time-authorization
trigger: "when implementing authorization for API endpoints or tool access"
confidence: 0.9
domain: "security, architecture"
source: "session-observation"
phase: "2,3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["security", "authorization", "capability-based", "tools", "api-design"]
---

# Registration-Time Authorization (Capability-Based Security)

## Action

Control access by registering only the tools/endpoints/capabilities that a user/context should have access to, rather than registering everything and checking permissions at runtime. If a tool doesn't exist in the registry, it can't be called. This is more secure and simpler than runtime ACL checks.

## Evidence

- Module registry in T-1.5.2 uses registration-time write control
- Write tools only registered when `allow_write: true` (ADR-004)
- If tool not registered, MCP clients can't see or invoke it
- Eliminates entire class of authorization bypass bugs
- Simpler: No need for ACL checks in every handler
- Performance: Zero runtime authorization overhead
- Common pattern: Unix capabilities, WASM capabilities, object-capability model

## Example

```typescript
// ✅ PREFER: Registration-time authorization
export function registerModule(
  server: Server,
  client: Client,
  config: ModuleConfig,
): void {
  // Read-only tools always available
  server.tool('list_incidents', 'List incidents', schema, listHandler);
  server.tool('get_incident', 'Get incident by ID', schema, getHandler);

  // Write tools only registered when allowed
  if (config.allow_write) {
    server.tool('create_incident', 'Create incident', schema, createHandler);
    server.tool('update_incident', 'Update incident', schema, updateHandler);
    server.tool('delete_incident', 'Delete incident', schema, deleteHandler);
  }
}
// If allow_write=false, write tools simply don't exist
// AI can't discover them, can't call them, can't bypass ACLs

// ❌ AVOID: Runtime authorization checks
server.tool('create_incident', 'Create incident', schema, async (params) => {
  // Runtime ACL check - vulnerable to bugs
  if (!hasPermission(context, 'write')) {
    throw new Error('Unauthorized');
  }
  // What if we forget the check?
  // What if hasPermission() has a bug?
  // What if context is undefined?
  return createIncident(params);
});
// Tool exists in registry even when user shouldn't have access
```

## When to Use Registration-Time Authorization

**Use capability-based (registration-time) when:**
- Permissions are stable (don't change during session)
- Context is known at initialization (server config, user role)
- Tools/endpoints are independent (not nested/hierarchical)
- Security is critical (minimize attack surface)
- System supports dynamic registration (can register per-session)

**Runtime checks are better when:**
- Permissions change during session (user upgrades tier)
- Context is request-specific (data ownership, field-level access)
- Complex conditional logic (time-based, rate-limited access)
- Unified endpoint with filtered results (GET /items returns user's items)

## Benefits

1. **Secure by default**: Can't invoke what doesn't exist
2. **Simple implementation**: No ACL checks in every handler
3. **Performance**: Zero runtime authorization overhead
4. **Clear surface area**: Tool list shows exactly what's accessible
5. **Fail-safe**: ACL bug can't bypass authorization (tool not registered)
6. **Auditability**: Easy to see what capabilities were granted
7. **Principle of least privilege**: Only register what's needed

## Pattern: Per-Session Capability Registration

```typescript
// Server initialization with user context
export function createUserSession(user: User, config: Config): Server {
  const server = new Server();

  // Register tools based on user's role/permissions
  registerReadTools(server); // Everyone gets read access

  if (user.hasPermission('write')) {
    registerWriteTools(server); // Only write-enabled users
  }

  if (user.hasPermission('admin')) {
    registerAdminTools(server); // Only admins
  }

  return server;
}
// Each user gets a server with only their capabilities
// No runtime checks needed in tool handlers
```

## Hybrid Approach for Complex Cases

```typescript
// Registration-time for coarse-grained access
if (config.allow_admin) {
  server.tool('delete_user', 'Delete user', schema, async (params) => {
    // Runtime check for fine-grained control (can only delete own org)
    if (params.userId.org !== currentUser.org) {
      throw new Error('Cannot delete users from other organizations');
    }
    return deleteUser(params.userId);
  });
}
// Registration controls WHO can see the tool
// Runtime check controls WHICH resources they can affect
```

## MCP-Specific Benefits

In Model Context Protocol:
- **Tool discovery**: AI sees only tools it can use
- **Prompt optimization**: AI doesn't waste tokens asking for forbidden tools
- **Clear capabilities**: `tools/list` response shows exact permissions
- **No confused deputy**: AI can't trick handlers into unauthorized actions

## Comparison

| Aspect | Registration-Time | Runtime ACL |
|--------|-------------------|-------------|
| **Security** | Secure by default | Vulnerable to bugs |
| **Complexity** | Simple | Complex checks |
| **Performance** | Zero overhead | Per-request overhead |
| **Audit** | Easy (tool list) | Hard (inspect code) |
| **Granularity** | Coarse (tool-level) | Fine (field/record) |
| **Flexibility** | Static per session | Dynamic per request |

## Related Patterns

- Feature flags (registration-time feature control)
- Object-capability model (WASM, E language)
- Principle of least privilege (only grant needed capabilities)
- Fail-safe defaults (deny by default)

## Further Reading

- ADR-004: Tool Registration at Startup (not runtime auth)
- Object-Capability Model: http://erights.org/elib/capability/
- Capability-based security (Wikipedia)
