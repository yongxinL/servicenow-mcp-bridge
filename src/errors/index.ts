/**
 * Error normalization for ServiceNow MCP Bridge.
 * Maps HTTP errors, network errors, and circuit breaker errors to MCP-compliant responses.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ServiceNowHttpError } from '../client/types.js';
import { CircuitOpenError } from '../resilience/circuit-breaker.js';
import { ServiceNowErrorCode } from './types.js';
import { buildErrorResult } from './mcp-error.js';

export { ServiceNowErrorCode, type ErrorContext } from './types.js';
export { buildErrorResult, buildEmptyResultResponse } from './mcp-error.js';

/**
 * Normalize any error into an MCP-compliant CallToolResult.
 *
 * Maps errors to standardized error codes:
 * - HTTP 400 -> VALIDATION_ERROR
 * - HTTP 401 -> AUTHENTICATION_ERROR
 * - HTTP 403 -> AUTHORIZATION_ERROR
 * - HTTP 404 -> NOT_FOUND
 * - HTTP 429 -> RATE_LIMITED
 * - HTTP 5xx -> SERVER_ERROR
 * - Network errors -> NETWORK_ERROR
 * - Circuit open -> CIRCUIT_OPEN
 * - Unknown errors -> SERVER_ERROR
 *
 * Error responses include sanitized details (no stack traces, no internal paths).
 *
 * @param error - Any error thrown by ServiceNow operations
 * @returns MCP CallToolResult with isError: true and structured error message
 *
 * @example
 * try {
 *   await client.get('incident');
 * } catch (error) {
 *   return normalizeError(error);
 * }
 */
export function normalizeError(error: unknown): CallToolResult {
  // ServiceNow HTTP errors
  if (error instanceof ServiceNowHttpError) {
    return httpErrorToResult(error);
  }

  // Circuit breaker errors
  if (error instanceof CircuitOpenError) {
    return buildErrorResult(
      ServiceNowErrorCode.CIRCUIT_OPEN,
      'Service temporarily unavailable. Circuit breaker is open.',
      `Reset in approximately ${Math.ceil(error.remainingMs / 1000)} seconds. The service has experienced repeated failures.`,
    );
  }

  // Network errors (fetch failures)
  if (error instanceof TypeError) {
    return buildErrorResult(
      ServiceNowErrorCode.NETWORK_ERROR,
      'Unable to connect to ServiceNow instance.',
      'Check that the instance URL is correct and the network is reachable. Verify firewall settings and DNS resolution.',
    );
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return buildErrorResult(
      ServiceNowErrorCode.NETWORK_ERROR,
      'Request to ServiceNow timed out.',
      'The request exceeded the configured timeout. Try again or increase the timeout setting.',
    );
  }

  // Unknown error fallback
  return buildErrorResult(
    ServiceNowErrorCode.SERVER_ERROR,
    'An unexpected error occurred.',
    error instanceof Error ? error.message : undefined,
  );
}

/**
 * Map HTTP status codes to MCP error results.
 */
function httpErrorToResult(error: ServiceNowHttpError): CallToolResult {
  // Explicit status code mappings
  const statusMappings: Record<
    number,
    { code: ServiceNowErrorCode; message: string }
  > = {
    400: {
      code: ServiceNowErrorCode.VALIDATION_ERROR,
      message: 'Invalid request. Check your query parameters and field values.',
    },
    401: {
      code: ServiceNowErrorCode.AUTHENTICATION_ERROR,
      message:
        'Authentication failed. Check your ServiceNow credentials and ensure they are valid.',
    },
    403: {
      code: ServiceNowErrorCode.AUTHORIZATION_ERROR,
      message:
        'Access denied. Your ServiceNow account lacks the required ACL permissions for this operation.',
    },
    404: {
      code: ServiceNowErrorCode.NOT_FOUND,
      message: 'Record or table not found. Verify the table name and sys_id are correct.',
    },
    429: {
      code: ServiceNowErrorCode.RATE_LIMITED,
      message:
        'ServiceNow rate limit exceeded. Please wait before making additional requests.',
    },
  };

  // Check for explicit mapping
  const mapping = statusMappings[error.statusCode];
  if (mapping) {
    return buildErrorResult(
      mapping.code,
      mapping.message,
      sanitizeErrorBody(error.body),
    );
  }

  // 5xx server errors
  if (error.statusCode >= 500) {
    return buildErrorResult(
      ServiceNowErrorCode.SERVER_ERROR,
      `ServiceNow server error (${error.statusCode}). The service is experiencing issues.`,
      sanitizeErrorBody(error.body),
    );
  }

  // Unmapped 4xx errors (fall back to validation error)
  return buildErrorResult(
    ServiceNowErrorCode.VALIDATION_ERROR,
    `Request failed with status ${error.statusCode}.`,
    sanitizeErrorBody(error.body),
  );
}

/**
 * Sanitize error response body to prevent leaking sensitive information.
 *
 * Extracts user-friendly error messages from ServiceNow JSON responses
 * and strips stack traces, internal paths, and other sensitive details.
 *
 * @param body - Raw HTTP response body
 * @returns Sanitized error details or undefined if body is unsafe
 */
function sanitizeErrorBody(body: string): string | undefined {
  if (!body || body.length === 0) {
    return undefined;
  }

  // Try parsing as ServiceNow JSON error response
  try {
    const parsed = JSON.parse(body);

    // ServiceNow error format: { error: { message: "...", detail: "..." } }
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
    if (parsed?.error?.detail) {
      return parsed.error.detail;
    }
  } catch {
    // Not JSON or malformed — fall through to raw body handling
  }

  // Truncate very long error bodies
  const truncated = body.substring(0, 500);

  // Strip anything that looks like sensitive internal information
  const sensitivePatterns = [
    /at .+:\d+:\d+/, // Stack trace lines
    /\/opt\//, // Internal file paths
    /\/usr\//, // System paths
    /\\node_modules\\/, // Windows paths
    /password/i, // Potential credential leak
    /token/i, // Potential token leak
    /secret/i, // Potential secret leak
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(truncated)) {
      return undefined; // Don't expose potentially sensitive content
    }
  }

  return truncated;
}
