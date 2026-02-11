/**
 * MCP error result builder for CallToolResult responses.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ServiceNowErrorCode } from './types.js';

/**
 * Build an MCP error result with structured text content.
 *
 * Error results have `isError: true` and contain:
 * - Error code in [BRACKETS]
 * - Human-readable message
 * - Optional details (sanitized)
 *
 * @param code - Standardized error code
 * @param message - User-friendly error message
 * @param details - Optional additional context (should be sanitized)
 * @returns MCP CallToolResult with isError: true
 *
 * @example
 * buildErrorResult(
 *   ServiceNowErrorCode.NOT_FOUND,
 *   "Record not found",
 *   "No incident with sys_id abc123"
 * )
 * // Returns:
 * // {
 * //   content: [{ type: "text", text: "[NOT_FOUND] Record not found\n\nDetails: No incident with sys_id abc123" }],
 * //   isError: true
 * // }
 */
export function buildErrorResult(
  code: ServiceNowErrorCode,
  message: string,
  details?: string,
): CallToolResult {
  const text = details
    ? `[${code}] ${message}\n\nDetails: ${details}`
    : `[${code}] ${message}`;

  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/**
 * Build a successful response for empty result sets.
 *
 * Empty results are NOT errors — they indicate no records matched the query.
 * Returns CallToolResult with isError: false and descriptive message.
 *
 * @param table - Table name that was queried
 * @param query - Optional query string that was applied
 * @returns MCP CallToolResult with isError: false
 *
 * @example
 * buildEmptyResultResponse("incident", "active=true^priority=1")
 * // Returns:
 * // {
 * //   content: [{ type: "text", text: 'No records found in table "incident" matching query: active=true^priority=1' }],
 * //   isError: false
 * // }
 */
export function buildEmptyResultResponse(
  table: string,
  query?: string,
): CallToolResult {
  const message = query
    ? `No records found in table "${table}" matching query: ${query}`
    : `No records found in table "${table}".`;

  return {
    content: [{ type: 'text', text: message }],
    isError: false,
  };
}
