---
id: plugin-architecture-with-static-registry
trigger: "when implementing plugin/module system with runtime registration"
confidence: 0.85
domain: "architecture"
source: "session-observation"
phase: "2,3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["architecture", "plugins", "registry", "extensibility", "modules"]
---

# Plugin Architecture with Static Registry Array

## Action

Use a static array of plugins/modules as the single source of truth for available plugins. Avoid dynamic file system scanning, decorator-based registration, or runtime discovery. Adding a plugin requires only adding it to the array.

## Evidence

- Module registry implemented in T-1.5.2 with `ALL_MODULES` array
- Simple, explicit, no hidden magic
- Easy to understand what modules are available (just read the array)
- Adding a module: import + add to array (2 lines of code)
- No file system dependencies, works in any bundler/runtime
- TypeScript can statically analyze the entire module list
- Zero performance overhead vs dynamic discovery

## Example

```typescript
// ✅ PREFER: Static registry array
import { incidentModule } from './modules/incident/index.js';
import { knowledgeModule } from './modules/knowledge/index.js';
import { cmdbModule } from './modules/cmdb/index.js';

export const ALL_MODULES: Plugin[] = [
  incidentModule,
  knowledgeModule,
  cmdbModule,
];

// Registration is simple iteration
export function registerPlugins(registry: Registry): void {
  for (const plugin of ALL_MODULES) {
    if (shouldEnable(plugin)) {
      plugin.initialize(registry);
    }
  }
}

// ❌ AVOID: Dynamic file system discovery
export function discoverModules(): Plugin[] {
  const modulesDir = path.join(__dirname, 'modules');
  const files = fs.readdirSync(modulesDir);
  return files
    .filter(f => f.endsWith('.js'))
    .map(f => require(path.join(modulesDir, f)).default);
}
// Problems: Runtime fs dependency, path resolution issues, bundler incompatibility
```

## When to Use Static Registry

**Use static array when:**
- Plugin count is manageable (< 50-100 plugins)
- Plugins are known at compile time
- You want clear, explicit plugin list
- Working with bundlers (webpack, esbuild, etc.)
- Type safety is important

**Consider dynamic discovery when:**
- Truly user-extensible plugins (user installs npm packages)
- Plugin count is very large (hundreds)
- Plugins are unknown at compile time

## Benefits

1. **Explicit and visible**: Every plugin is declared in one place
2. **Simple implementation**: No file system scanning or dynamic imports
3. **Bundler-friendly**: Works with webpack, esbuild, rollup, etc.
4. **Type-safe**: TypeScript validates all plugins at compile time
5. **Fast**: Zero file system overhead, plugins loaded at import time
6. **Debuggable**: Stack traces show exact plugin being registered
7. **Testable**: Easy to mock the array for testing

## Pattern

```typescript
// Define plugin interface
export interface Plugin {
  name: string;
  description: string;
  initialize(context: Context): void;
}

// Create static registry (initially empty)
export const ALL_PLUGINS: Plugin[] = [
  // Plugins added here as they're implemented
];

// Register all enabled plugins
export function registerPlugins(
  context: Context,
  config: Config,
  logger: Logger,
): void {
  logger.info(`Registering ${ALL_PLUGINS.length} plugins...`);

  for (const plugin of ALL_PLUGINS) {
    const pluginConfig = config.plugins[plugin.name];

    if (!pluginConfig?.enabled) {
      logger.debug(`Skipping disabled plugin: ${plugin.name}`);
      continue;
    }

    try {
      plugin.initialize(context);
      logger.info(`Registered plugin: ${plugin.name}`);
    } catch (error) {
      logger.error(`Failed to register ${plugin.name}:`, error);
      // Continue with other plugins (resilient registration)
    }
  }
}
```

## Adding a New Plugin

```typescript
// 1. Implement the plugin
// src/plugins/analytics/index.ts
export const analyticsPlugin: Plugin = {
  name: 'analytics',
  description: 'Analytics tracking',
  initialize(context) {
    context.addEventHandler('page_view', trackPageView);
  },
};

// 2. Add to registry (ONE line)
// src/plugins/registry.ts
import { analyticsPlugin } from './analytics/index.js';

export const ALL_PLUGINS: Plugin[] = [
  incidentPlugin,
  knowledgePlugin,
  analyticsPlugin, // ← Added here
];

// Done! Plugin now participates in registration
```

## Related Patterns

- Feature flag gating (config controls which plugins are enabled)
- Resilient initialization (plugin failure doesn't break the system)
- Dependency injection (pass context/services to plugins)
