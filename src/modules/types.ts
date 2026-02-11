/**
 * Module system types and interfaces.
 *
 * Defines the contract for ServiceNow domain modules (Incident, Knowledge, CMDB, etc.)
 * and their configuration structure.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ServiceNowClient } from '../client/index.js';

/**
 * Per-module configuration structure.
 *
 * Read from application config (config.modules[moduleName]).
 */
export interface ModuleConfig {
  /** Whether this module is enabled and should register tools */
  enabled: boolean;

  /**
   * Whether write tools (create, update, delete) should be registered.
   * Read-only tools are always registered when the module is enabled.
   * Write tools are only registered when this flag is true.
   */
  allow_write: boolean;
}

/**
 * ServiceNow domain module interface.
 *
 * Each module implements this interface to participate in the module registry.
 * Modules are responsible for registering their MCP tools with the server.
 *
 * @example
 * const incidentModule: ServiceNowModule = {
 *   name: "incident",
 *   description: "Incident Management",
 *   register(server, client, config) {
 *     // Register read tools (always available)
 *     server.tool("list_incidents", "List incidents", schema, handler);
 *
 *     // Register write tools (only when allow_write is true)
 *     if (config.allow_write) {
 *       server.tool("create_incident", "Create incident", schema, handler);
 *     }
 *   }
 * };
 */
export interface ServiceNowModule {
  /**
   * Unique module identifier.
   * Must match the key in config.modules (e.g., "incident", "knowledge", "cmdb").
   */
  name: string;

  /**
   * Human-readable description for logging and documentation.
   * Example: "Incident Management", "Knowledge Base", "CMDB"
   */
  description: string;

  /**
   * Register MCP tools with the server.
   *
   * This method is called by the module registry at server startup for each
   * enabled module. The module should register its tools using server.tool().
   *
   * Read-only tools (list, get, search, query) should always be registered
   * when the module is enabled.
   *
   * Write tools (create, update, delete) should only be registered when
   * config.allow_write is true. This provides per-module write control.
   *
   * @param server - MCP server instance for tool registration
   * @param client - ServiceNow HTTP client for API calls
   * @param config - Module-specific configuration (enabled, allow_write)
   *
   * @throws Should throw on critical registration failures. The registry will
   *         catch and log the error, then continue with other modules.
   */
  register(server: Server, client: ServiceNowClient, config: ModuleConfig): void;
}
