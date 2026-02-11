---
id: resilient-component-initialization
trigger: "when initializing multiple independent components at startup"
confidence: 0.9
domain: "architecture"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["error-handling", "initialization", "resilience", "startup", "modules"]
---

# Resilient Component Initialization (Fail Partial, Not Total)

## Action

When initializing multiple independent components (plugins, modules, connectors), catch and log errors for individual component failures but continue initializing remaining components. Don't let one broken component prevent the entire system from starting.

## Evidence

- Module registry in T-1.5.2 catches registration errors per-module
- Single broken module doesn't prevent other modules from loading
- Server remains operational with partial functionality
- Error is logged with full context for debugging
- Production stability: 3 working modules better than 0
- Common in production systems (VS Code extensions, browser plugins, microservices)

## Example

```typescript
// ✅ PREFER: Resilient initialization with per-component error handling
export function registerModules(
  server: Server,
  modules: Module[],
  logger: Logger,
): void {
  let successCount = 0;
  let failureCount = 0;

  for (const module of modules) {
    try {
      module.initialize(server);
      successCount++;
      logger.info(`Module registered: ${module.name}`);
    } catch (error) {
      failureCount++;
      logger.error({
        module: module.name,
        error: error instanceof Error ? error.message : String(error),
      }, `Failed to register module — continuing with other modules`);
      // Continue loop - don't rethrow
    }
  }

  logger.info({
    successCount,
    failureCount,
    totalModules: modules.length,
  }, 'Module registration complete');

  // Optional: Fail if NO modules loaded (vs some modules)
  if (successCount === 0 && modules.length > 0) {
    throw new Error('All modules failed to register');
  }
}

// ❌ AVOID: Fail-fast kills entire system on single component failure
export function registerModules(server: Server, modules: Module[]): void {
  for (const module of modules) {
    module.initialize(server); // Throws on error → entire system down
  }
}
// If one module has a typo, ZERO modules are registered
```

## When to Use Resilient Initialization

**Use resilient initialization for:**
- Plugin/module systems (independent components)
- Service connectors (multiple databases, APIs)
- Feature modules (optional functionality)
- Background workers (non-critical tasks)

**Fail-fast is better for:**
- Core infrastructure (database connection, config loading)
- Single-component systems (no independence)
- Security-critical components (auth, encryption)
- Components with hard dependencies on each other

## Benefits

1. **Partial availability**: System works with subset of features
2. **Production stability**: One broken plugin doesn't kill everything
3. **Debugging in production**: System stays up, logs show what failed
4. **Gradual degradation**: Users get most features, some missing
5. **Development ergonomics**: Work on one module without breaking others
6. **Operational visibility**: Metrics show failure rates per component

## Pattern

```typescript
export interface InitResult {
  component: string;
  success: boolean;
  error?: Error;
}

export function initializeComponents(
  components: Component[],
  logger: Logger,
): InitResult[] {
  const results: InitResult[] = [];

  for (const component of components) {
    try {
      component.init();
      results.push({ component: component.name, success: true });
      logger.info(`✓ ${component.name} initialized`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      results.push({ component: component.name, success: false, error: err });
      logger.error(`✗ ${component.name} failed:`, err.message);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  logger.info(`Initialization complete: ${successCount}/${components.length} succeeded`);

  // Optional: Enforce minimum success threshold
  if (successCount < components.length * 0.5) {
    throw new Error('Too many component failures');
  }

  return results;
}
```

## Logging Best Practices

```typescript
// ✅ GOOD: Detailed error context
logger.error({
  component: component.name,
  error: error.message,
  stack: error.stack,
  componentConfig: component.config, // May help debugging
}, `Component initialization failed — continuing with others`);

// Include clear indication that system is continuing:
// "continuing with others", "partial failure", "system operational"
```

## Health Check Integration

```typescript
// Expose initialization results for health checks
export class ComponentRegistry {
  private results: Map<string, InitResult> = new Map();

  getHealth(): { healthy: boolean; details: Record<string, boolean> } {
    const details: Record<string, boolean> = {};
    let healthyCount = 0;

    for (const [name, result] of this.results) {
      details[name] = result.success;
      if (result.success) healthyCount++;
    }

    return {
      healthy: healthyCount > 0, // At least one component working
      details,
    };
  }
}
```

## Related Patterns

- Circuit breaker (automatic recovery from component failures)
- Health checks (expose component status)
- Feature flags (disable broken components without redeployment)
- Graceful degradation (system works with reduced functionality)
