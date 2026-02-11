/**
 * Error codes and types for ServiceNow MCP Bridge.
 */

/**
 * Standardized error codes for ServiceNow operations.
 * Maps to MCP error responses for consistent client handling.
 */
export enum ServiceNowErrorCode {
  /** Request validation failed (HTTP 400) */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /** Authentication failed (HTTP 401) */
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',

  /** Authorization/permission denied (HTTP 403) */
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',

  /** Record or table not found (HTTP 404) */
  NOT_FOUND = 'NOT_FOUND',

  /** ServiceNow rate limit exceeded (HTTP 429) */
  RATE_LIMITED = 'RATE_LIMITED',

  /** ServiceNow server error (HTTP 5xx) */
  SERVER_ERROR = 'SERVER_ERROR',

  /** Network connectivity error (fetch failure, timeout) */
  NETWORK_ERROR = 'NETWORK_ERROR',

  /** Circuit breaker is open (fast fail) */
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}

/**
 * Structured error information for logging and debugging.
 * Not exposed directly to MCP clients (sanitized first).
 */
export interface ErrorContext {
  code: ServiceNowErrorCode;
  message: string;
  details?: string;
  httpStatus?: number;
  originalError?: unknown;
}
