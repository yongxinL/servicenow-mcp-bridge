/**
 * Default configuration values for all non-sensitive settings.
 * These values are used as the base layer in the 3-tier configuration system.
 *
 * Security Note: This file should NEVER contain sensitive values like passwords,
 * tokens, or API keys. Those must be provided via environment variables only.
 */

/**
 * Default configuration object
 * Note: Auth credentials and ServiceNow instance are intentionally omitted
 * as they must be provided by the user.
 */
export const defaults = {
  servicenow: {
    // instance: must be provided by user
    timeout: 30000,          // 30 seconds
    max_retries: 3,
  },
  // auth: must be fully provided by user via environment variables
  modules: {
    generic: {
      enabled: true,
      allow_write: false,    // Safe default: read-only
    },
    knowledge: {
      enabled: true,
      allow_write: false,
    },
    incident: {
      enabled: true,
      allow_write: false,
    },
    change: {
      enabled: true,
      allow_write: false,
    },
    problem: {
      enabled: true,
      allow_write: false,
    },
    cmdb: {
      enabled: true,
      allow_write: false,
    },
    catalog: {
      enabled: true,
      allow_write: false,
    },
    user: {
      enabled: true,
      // User module is always read-only
    },
  },
  rate_limit: {
    max_per_hour: 1000,      // ServiceNow typically allows 1000-5000 req/hour
    burst_size: 20,          // Allow short bursts of requests
  },
  circuit_breaker: {
    enabled: false,          // Disabled by default for simpler initial setup
    failure_threshold: 5,    // Open circuit after 5 consecutive failures
    reset_timeout_ms: 30000, // Try to close circuit after 30 seconds
  },
  logging: {
    level: 'info' as const,  // Production-appropriate default
  },
} as const;

/**
 * Type representing partial configuration (used during merging)
 */
export type PartialConfig = typeof defaults;
