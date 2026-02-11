---
id: centralized-tool-registry-pattern
trigger: "when implementing plugin system where plugins register handlers with a server"
confidence: 0.9
domain: "architecture"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["architecture", "plugins", "registry", "handler-routing", "mcp"]
---

# Centralized Tool Registry Pattern (Aggregation over Direct Registration)

## Action

When building a plugin system where multiple plugins need to register handlers with a server that only allows ONE handler per method, use a centralized registry that:
1. Collects handler definitions from all plugins
2. Aggregates them into a single registration
3. Routes requests to the appropriate plugin handler

Do NOT have each plugin call `server.registerHandler()` directly - they'll overwrite each other.

## Evidence

- T-2.1.1: Generic module initially tried to register 'tools/list' and 'tools/call' directly
- Problem: Each module calling `setRequestHandler('tools/call')` overwrites the previous
- Solution: Modules return `{tools, handlers}`, registry aggregates and registers once
- Pattern works for MCP servers, HTTP routers, event handlers, RPC systems

## Example

```typescript
// ❌ AVOID: Direct registration (modules overwrite each other)
export interface Plugin {
  register(server: Server): void;
}

const pluginA: Plugin = {
  register(server) {
    server.setRequestHandler('tools/call', async (req) => {
      // Handle plugin A tools
    });
  }
};

const pluginB: Plugin = {
  register(server) {
    server.setRequestHandler('tools/call', async (req) => {
      // Handle plugin B tools
      // ⚠️ This overwrites plugin A's handler!
    });
  }
};

// ✅ PREFER: Centralized aggregation pattern
export interface Plugin {
  name: string;
  getTools(): {
    tools: ToolDef[];
    handlers: Map<string, Handler>;
  };
}

const pluginA: Plugin = {
  name: 'pluginA',
  getTools() {
    const tools = [{ name: 'tool_a', ... }];
    const handlers = new Map();
    handlers.set('tool_a', async (args) => { ... });
    return { tools, handlers };
  }
};

// Registry aggregates all plugins
function registerPlugins(server: Server, plugins: Plugin[]) {
  const allTools = [];
  const allHandlers = new Map();

  for (const plugin of plugins) {
    const { tools, handlers } = plugin.getTools();
    allTools.push(...tools);
    for (const [name, handler] of handlers) {
      allHandlers.set(name, handler);
    }
  }

  // Single registration point
  server.setRequestHandler('tools/list', async () => ({
    tools: allTools
  }));

  server.setRequestHandler('tools/call', async (req) => {
    const toolName = req.params.name;
    const handler = allHandlers.get(toolName);
    return await handler(req.params.arguments);
  });
}
```

## When to Use Centralized Registry

**Use this pattern when:**
- Server/framework allows only ONE handler per method/route
- Multiple plugins need to handle the same method type
- Plugin handlers are independent (no shared state)
- You control the plugin interface design

**Direct registration works when:**
- Each plugin registers UNIQUE methods/routes (no conflicts)
- Server supports multiple handlers per method (middleware chains)
- Plugins coordinate to avoid conflicts (anti-pattern)

## Benefits

1. **No handler conflicts**: Each tool name unique, routes correctly
2. **Plugin independence**: Plugins don't know about each other
3. **Atomic registration**: All-or-nothing, no partial states
4. **Centralized error handling**: Single try/catch for all tools
5. **Easy to inspect**: See all registered tools in one place
6. **Performance**: Single handler, Map lookup vs repeated registration

## Pattern Variations

### REST API Routes

```typescript
// Centralized route aggregation
function registerRoutes(app: Express, modules: Module[]) {
  for (const module of modules) {
    const routes = module.getRoutes();
    for (const route of routes) {
      app[route.method](route.path, route.handler);
    }
  }
}
```

### Event Handlers

```typescript
// Centralized event subscription
function registerEventHandlers(emitter: EventEmitter, plugins: Plugin[]) {
  const handlers = new Map<string, Handler[]>();

  for (const plugin of plugins) {
    for (const [event, handler] of plugin.getEventHandlers()) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
    }
  }

  for (const [event, eventHandlers] of handlers) {
    emitter.on(event, async (data) => {
      for (const handler of eventHandlers) {
        await handler(data);
      }
    });
  }
}
```

### RPC Methods

```typescript
// Centralized RPC method registration
function registerRpcMethods(server: RpcServer, services: Service[]) {
  const methods = new Map<string, RpcHandler>();

  for (const service of services) {
    for (const [methodName, handler] of service.getMethods()) {
      if (methods.has(methodName)) {
        throw new Error(`Duplicate RPC method: ${methodName}`);
      }
      methods.set(methodName, handler);
    }
  }

  server.setMethodHandler(async (methodName, args) => {
    const handler = methods.get(methodName);
    if (!handler) throw new Error(`Unknown method: ${methodName}`);
    return await handler(args);
  });
}
```

## Architecture Evolution

```
Phase 1: Direct Registration (Simple)
├─ Few plugins
├─ Unique method names per plugin
└─ No conflicts

Phase 2: Handler Conflicts (Problem)
├─ More plugins added
├─ Plugins overwrite each other
└─ Only last plugin works

Phase 3: Centralized Registry (Solution)
├─ Plugins return definitions
├─ Registry aggregates
├─ Single registration
└─ All plugins work together
```

## Related Patterns

- Plugin architecture with static registry (ALL_MODULES array)
- Mediator pattern (central coordinator)
- Registry pattern (central repository)
- Router pattern (request routing)
