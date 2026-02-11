/**
 * Module registry for ServiceNow domain modules.
 *
 * The registry manages module lifecycle:
 * 1. Reads feature flags from configuration
 * 2. Instantiates only enabled modules
 * 3. Calls each module's register() method to add MCP tools to the server
 * 4. Handles registration errors gracefully (logs and continues)
 *
 * Adding a new module:
 * 1. Implement the module (in M2/M3 tasks)
 * 2. Add the module to ALL_MODULES array below
 * 3. Ensure config.modules has an entry for the module
 */

import type { Logger } from 'pino';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ServiceNowClient } from '../client/index.js';
import type { AppConfig } from '../config/schema.js';
import type { ServiceNowModule, ModuleConfig } from './types.js';

/**
 * All available ServiceNow modules.
 *
 * This array serves as the single source of truth for which modules exist.
 * Modules are registered at startup in the order they appear in this array.
 *
 * Initially empty — modules are added as they are implemented:
 * - T-2.1.1: Generic module (query_records, get_record)
 * - T-2.2.1: Knowledge Base module (search_kb, get_kb_article)
 * - T-2.3.1: Incident module (list_incidents, get_incident, create_incident)
 * - T-3.1.1: Change module
 * - T-3.2.1: Problem module
 * - T-3.3.1: CMDB module
 * - T-3.4.1: Catalog module
 * - T-3.5.1: User module
 *
 * @example
 * // When a module is implemented, import and add it:
 * import { incidentModule } from './incident/index.js';
 * export const ALL_MODULES: ServiceNowModule[] = [
 *   incidentModule,
 * ];
 */
export const ALL_MODULES: ServiceNowModule[] = [
  // Modules will be added here as they are implemented in M2 and M3
];

/**
 * Register enabled modules with the MCP server.
 *
 * Iterates through ALL_MODULES, checks configuration, and calls register()
 * for each enabled module. Write tools are conditionally registered based
 * on per-module allow_write flags.
 *
 * Registration is resilient: if a module fails to register, the error is
 * logged and the registry continues with remaining modules. This prevents
 * a single broken module from bringing down the entire server.
 *
 * @param server - MCP server instance for tool registration
 * @param client - ServiceNow HTTP client passed to each module
 * @param config - Application configuration with module feature flags
 * @param logger - Logger for tracking module registration status
 *
 * @example
 * const server = createMcpServer();
 * const client = new ServiceNowClient(...);
 * const config = loadConfig();
 * const logger = getLogger();
 * registerModules(server, client, config, logger);
 * // Server now has tools from all enabled modules
 */
export function registerModules(
  server: Server,
  client: ServiceNowClient,
  config: AppConfig,
  logger: Logger,
): void {
  let enabledCount = 0;
  let failedCount = 0;

  logger.info(
    { totalModules: ALL_MODULES.length },
    'Starting module registration...',
  );

  for (const module of ALL_MODULES) {
    // Check if module has a configuration entry
    const moduleConfig = config.modules[
      module.name as keyof typeof config.modules
    ];

    if (!moduleConfig) {
      logger.warn(
        { module: module.name },
        'Module has no configuration entry — skipping',
      );
      continue;
    }

    // Skip disabled modules
    if (!moduleConfig.enabled) {
      logger.debug({ module: module.name }, 'Module disabled — skipping');
      continue;
    }

    // Register enabled module
    try {
      // Build ModuleConfig from app config
      // User module doesn't have allow_write, so we default to false
      const modConfig: ModuleConfig = {
        enabled: moduleConfig.enabled,
        allow_write:
          'allow_write' in moduleConfig ? moduleConfig.allow_write : false,
      };

      // Call module's register() method
      module.register(server, client, modConfig);
      enabledCount++;

      logger.info(
        {
          module: module.name,
          allow_write: modConfig.allow_write,
        },
        `Module registered: ${module.description}`,
      );
    } catch (error) {
      failedCount++;
      logger.error(
        {
          module: module.name,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to register module: ${module.name} — continuing with other modules`,
      );
    }
  }

  logger.info(
    {
      enabledCount,
      failedCount,
      totalAvailable: ALL_MODULES.length,
    },
    'Module registration complete',
  );
}
