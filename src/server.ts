/**
 * MCP server creation and stdio transport wiring.
 *
 * This module provides factory functions for creating an MCP server instance
 * and connecting it to stdio transport for communication with MCP clients
 * (Claude Desktop, Cursor, etc.).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Get version string from package.json.
 *
 * For v0.1.0, we use a hardcoded version string to avoid path resolution
 * issues in bundled builds. This will be updated during the release process.
 *
 * @returns Version string (e.g., "0.1.0")
 */
function getVersion(): string {
  return '0.1.0';
}

/**
 * Create an MCP server instance.
 *
 * The server is configured with:
 * - Name: "servicenow-mcp-bridge"
 * - Version: Read from package.json
 *
 * Tools are not registered here — they are added by the module registry
 * in T-1.5.2 (next task).
 *
 * @returns Configured MCP server instance
 *
 * @example
 * const server = createMcpServer();
 * // Register tools via module registry (T-1.5.2)
 * await connectStdioTransport(server);
 */
export function createMcpServer(): Server {
  return new Server(
    {
      name: 'servicenow-mcp-bridge',
      version: getVersion(),
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
}

/**
 * Connect the MCP server to stdio transport.
 *
 * Stdio transport uses stdin/stdout for MCP protocol communication.
 * This is the standard transport used by Claude Desktop, Cursor,
 * and other MCP clients.
 *
 * IMPORTANT: All application logs must go to stderr (not stdout)
 * to avoid interfering with the MCP protocol JSON-RPC messages.
 *
 * @param server - MCP server instance to connect
 * @returns Promise that resolves when transport is connected
 *
 * @example
 * const server = createMcpServer();
 * await connectStdioTransport(server);
 * // Server is now listening for MCP protocol messages
 */
export async function connectStdioTransport(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
