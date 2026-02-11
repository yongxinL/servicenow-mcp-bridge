/**
 * Structured JSON logging for ServiceNow MCP Bridge.
 * Uses Pino v9 for fast, production-grade JSON logging to stderr.
 * Provides child logger factory with correlation ID injection and credential redaction.
 */

import pino from 'pino';

/**
 * API call logging data structure.
 * Captures standardized metrics for ServiceNow API calls.
 */
export interface ApiCallLogData {
  method: string; // "GET", "POST", "PATCH", "DELETE"
  table: string; // ServiceNow table name
  duration_ms: number; // Request duration in milliseconds
  status_code: number; // HTTP response status code
  sys_id?: string; // Optional record ID
}

/**
 * Global logger instance (singleton pattern).
 * Initialized at server startup via initializeLogger().
 */
let _logger: pino.Logger | null = null;

/**
 * Request counter for generating correlation IDs.
 * Simple incrementing counter is sufficient for single-process server.
 */
let _requestCounter = 0;

/**
 * Create a Pino logger configured for the MCP bridge.
 *
 * Features:
 * - Writes to stderr (fd 2) — stdout is reserved for MCP protocol JSON-RPC
 * - Structured JSON output for easy log aggregation
 * - Automatic credential redaction (passwords, tokens, authorization headers)
 * - Configurable log level (defaults to "info")
 *
 * @param level - Log level (trace, debug, info, warn, error, fatal). Defaults to "info".
 * @returns Configured Pino logger instance
 *
 * @example
 * const logger = createLogger("debug");
 * logger.info({ userId: "123" }, "User action");
 */
export function createLogger(level: string = 'info'): pino.Logger {
  return pino(
    {
      level,
      // Redact sensitive fields to prevent credential leakage
      redact: {
        paths: [
          'password',
          '*.password',
          'token',
          '*.token',
          'client_secret',
          '*.client_secret',
          'client_id', // Include client_id as it's sensitive in OAuth contexts
          '*.client_id',
          'authorization',
          '*.authorization',
          'headers.authorization',
          'headers.Authorization',
          'auth',
          '*.auth',
        ],
        censor: '[REDACTED]',
      },
    },
    pino.destination(2), // fd 2 = stderr (stdout is for MCP protocol)
  );
}

/**
 * Initialize the global logger singleton.
 *
 * This should be called once during server startup before any logging occurs.
 * Subsequent calls to getLogger() will return the initialized instance.
 *
 * @param level - Log level. Typically read from configuration system.
 * @returns The initialized logger instance
 *
 * @example
 * import { config } from './config/index.js';
 * initializeLogger(config.logLevel);
 */
export function initializeLogger(level: string): pino.Logger {
  _logger = createLogger(level);
  return _logger;
}

/**
 * Get the global logger singleton.
 *
 * Returns the logger initialized by initializeLogger().
 * If not yet initialized, creates a fallback logger with default settings.
 *
 * Should be imported and used by all modules for logging.
 *
 * @returns The global logger instance
 *
 * @example
 * import { getLogger } from './logging/index.js';
 * const logger = getLogger();
 * logger.info("Application started");
 */
export function getLogger(): pino.Logger {
  if (!_logger) {
    // Fallback for accessing logger before initialization
    // In production, initializeLogger() should be called first
    _logger = createLogger('info');
  }
  return _logger;
}

/**
 * Create a child logger with injected context and correlation ID.
 *
 * Each child logger receives a unique correlation ID for request tracing.
 * This enables tracking of requests across the system without requiring
 * explicit request ID passing between functions.
 *
 * Correlation IDs are simple incrementing counters with timestamp suffix:
 * Format: "req-{counter}-{timestamp-in-base36}"
 * Example: "req-1-z123abc"
 *
 * @param parent - Parent Pino logger instance
 * @param context - Optional context object to include in all logs from this child
 * @returns Child logger with injected correlationId and context
 *
 * @example
 * const childLogger = createChildLogger(logger, { userId: "12345" });
 * childLogger.info("Processing user request");
 * // Logs will include: { correlationId: "req-1-z123abc", userId: "12345" }
 */
export function createChildLogger(
  parent: pino.Logger,
  context?: Record<string, unknown>,
): pino.Logger {
  // Generate unique correlation ID: simple counter + timestamp
  // Counter resets with process; timestamp provides additional uniqueness
  const correlationId = `req-${++_requestCounter}-${Date.now().toString(36)}`;

  return parent.child({
    correlationId,
    ...context,
  });
}

/**
 * Log a ServiceNow API call with standardized metrics.
 *
 * Records API method, target table, response status, and duration.
 * Useful for monitoring API performance, detecting rate limiting,
 * and debugging integration issues.
 *
 * @param logger - Pino logger instance (typically a child logger)
 * @param data - API call metrics (method, table, duration_ms, status_code)
 *
 * @example
 * const start = Date.now();
 * const response = await fetch(url, options);
 * logApiCall(logger, {
 *   method: "GET",
 *   table: "incident",
 *   duration_ms: Date.now() - start,
 *   status_code: response.status,
 * });
 */
export function logApiCall(logger: pino.Logger, data: ApiCallLogData): void {
  logger.info(
    data,
    `${data.method} ${data.table} -> ${data.status_code} (${data.duration_ms}ms)`,
  );
}
