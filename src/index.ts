/**
 * ServiceNow MCP Bridge - Entry Point
 *
 * This is the main entry point for the MCP server. It orchestrates the
 * startup sequence: configuration loading, logger initialization, auth
 * strategy creation, ServiceNow client instantiation, MCP server creation,
 * and stdio transport connection.
 *
 * The server runs as a long-lived process, listening for MCP protocol
 * messages on stdin/stdout. All logs are written to stderr to avoid
 * interfering with the MCP protocol communication.
 */

import type { Logger } from 'pino';
import { loadConfig } from './config/index.js';
import { initializeLogger } from './logging/index.js';
import { createAuthStrategy } from './auth/index.js';
import { ServiceNowClient } from './client/index.js';
import { createMcpServer, connectStdioTransport } from './server.js';
import { registerModules } from './modules/index.js';

/**
 * Main entry point - orchestrates server startup sequence.
 *
 * Startup sequence:
 * 1. Load and validate configuration
 * 2. Initialize logger
 * 3. Create authentication strategy
 * 4. Create ServiceNow client
 * 5. Create MCP server
 * 6. Register modules (tools)
 * 7. Connect stdio transport
 * 8. Setup shutdown handlers
 *
 * Any error during startup causes the process to exit with code 1
 * and a descriptive error message to stderr. The server never starts
 * in a degraded state (fail-fast principle).
 */
async function main(): Promise<void> {
  try {
    // 1. Load and validate configuration
    const config = loadConfig();

    // 2. Initialize logger
    const logger = initializeLogger(config.logging.level);
    logger.info('Starting ServiceNow MCP Bridge...');

    // 3. Create auth strategy
    const authStrategy = createAuthStrategy(
      config.auth,
      config.servicenow.instance,
    );

    // 4. Create ServiceNow client
    const client = new ServiceNowClient(
      config.servicenow.instance,
      authStrategy,
      { timeout: config.servicenow.timeout },
    );

    // 5. Create MCP server
    const server = createMcpServer();

    // 6. Register modules (tools) with the server
    registerModules(server, client, config, logger);

    // 7. Connect stdio transport
    await connectStdioTransport(server);

    logger.info(
      {
        instance: config.servicenow.instance,
        authType: config.auth.type,
      },
      'ServiceNow MCP Bridge started successfully',
    );

    // 8. Setup graceful shutdown
    setupShutdownHandlers(logger);
  } catch (error) {
    // Startup failure — log to stderr and exit
    // Note: We use console.error directly here because the logger may not be initialized
    console.error('Failed to start ServiceNow MCP Bridge:', error);
    process.exit(1);
  }
}

/**
 * Setup handlers for graceful shutdown on SIGINT and SIGTERM signals.
 *
 * SIGINT: Sent when user presses Ctrl+C
 * SIGTERM: Sent by process managers for graceful shutdown
 *
 * Both signals trigger a clean shutdown with exit code 0.
 *
 * @param logger - Logger instance for shutdown message
 */
function setupShutdownHandlers(logger: Logger): void {
  const shutdown = () => {
    logger.info('Shutting down ServiceNow MCP Bridge...');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start the server
main();
