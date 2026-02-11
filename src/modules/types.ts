/**
 * Module system types and interfaces.
 *
 * Defines the contract for ServiceNow domain modules (Incident, Knowledge, CMDB, etc.)
 * and their configuration structure.
 */

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
 * Tool definition for MCP protocol.
 */
export interface Tool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
}

/**
 * Tool handler function type.
 * Returns MCP CallToolResult format.
 */
export type ToolHandler = (args: any) => Promise<any>;

/**
 * Module tools and handlers.
 * Returned by module's getTools() method for centralized registration.
 */
export interface ModuleTools {
  tools: Tool[];
  handlers: Map<string, ToolHandler>;
}

/**
 * ServiceNow domain module interface.
 *
 * Each module implements this interface to participate in the module registry.
 * Modules provide their tool definitions and handlers which are registered
 * centrally by the module registry.
 *
 * @example
 * const incidentModule: ServiceNowModule = {
 *   name: "incident",
 *   description: "Incident Management",
 *   getTools(client, config) {
 *     const tools: Tool[] = [
 *       { name: "list_incidents", description: "...", inputSchema: {...} }
 *     ];
 *     const handlers = new Map<string, ToolHandler>();
 *     handlers.set("list_incidents", async (args) => {...});
 *
 *     if (config.allow_write) {
 *       tools.push({ name: "create_incident", ... });
 *       handlers.set("create_incident", async (args) => {...});
 *     }
 *
 *     return { tools, handlers };
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
   * Get tool definitions and handlers for this module.
   *
   * This method is called by the module registry at server startup for each
   * enabled module. The module should return its tool definitions and handlers.
   *
   * Read-only tools (list, get, search, query) should always be included
   * when the module is enabled.
   *
   * Write tools (create, update, delete) should only be included when
   * config.allow_write is true. This provides per-module write control.
   *
   * @param client - ServiceNow HTTP client for API calls
   * @param config - Module-specific configuration (enabled, allow_write)
   * @returns Tool definitions and their handlers
   *
   * @throws Should throw on critical initialization failures. The registry will
   *         catch and log the error, then continue with other modules.
   */
  getTools(client: ServiceNowClient, config: ModuleConfig): ModuleTools;
}
