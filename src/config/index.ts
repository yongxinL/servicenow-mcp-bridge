/**
 * Configuration loader with 3-tier precedence system:
 * 1. Defaults (lowest priority)
 * 2. Local config file (medium priority)
 * 3. Environment variables (highest priority)
 *
 * The system fails fast with descriptive errors if configuration is invalid.
 */

import { readFileSync, existsSync } from 'node:fs';
import { configSchema, type AppConfig } from './schema.js';
import { defaults } from './defaults.js';

/**
 * Parse a boolean string from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return defaultValue;
}

/**
 * Parse a number string from environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load and parse local configuration file (JSON)
 */
function loadLocalConfig(configPath?: string): Record<string, any> {
  const path = configPath || process.env.CONFIG_FILE_PATH;
  if (!path || !existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load config file at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract configuration from environment variables
 */
function loadEnvConfig(): Record<string, any> {
  const env = process.env;
  const config: Record<string, any> = {};

  // ServiceNow configuration
  const servicenow: Record<string, any> = {};
  if (env.SERVICENOW_INSTANCE !== undefined) {
    servicenow.instance = env.SERVICENOW_INSTANCE;
  }
  if (env.SERVICENOW_TIMEOUT !== undefined) {
    servicenow.timeout = parseNumber(env.SERVICENOW_TIMEOUT, defaults.servicenow.timeout);
  }
  if (env.SERVICENOW_MAX_RETRIES !== undefined) {
    servicenow.max_retries = parseNumber(env.SERVICENOW_MAX_RETRIES, defaults.servicenow.max_retries);
  }
  if (Object.keys(servicenow).length > 0) {
    config.servicenow = servicenow;
  }

  // Authentication configuration (discriminated by type)
  const authType = env.SERVICENOW_AUTH_TYPE;
  if (authType) {
    if (authType === 'basic') {
      config.auth = {
        type: 'basic',
        username: env.SERVICENOW_USERNAME || '',
        password: env.SERVICENOW_PASSWORD || '',
      };
    } else if (authType === 'oauth') {
      config.auth = {
        type: 'oauth',
        client_id: env.SERVICENOW_CLIENT_ID || '',
        client_secret: env.SERVICENOW_CLIENT_SECRET || '',
        token_url: env.SERVICENOW_TOKEN_URL,
      };
    } else if (authType === 'token') {
      config.auth = {
        type: 'token',
        token: env.SERVICENOW_TOKEN || '',
      };
    }
  } else {
    // If auth type is not set but individual auth fields are set, merge them
    const auth: Record<string, any> = {};
    if (env.SERVICENOW_USERNAME !== undefined) auth.username = env.SERVICENOW_USERNAME;
    if (env.SERVICENOW_PASSWORD !== undefined) auth.password = env.SERVICENOW_PASSWORD;
    if (env.SERVICENOW_CLIENT_ID !== undefined) auth.client_id = env.SERVICENOW_CLIENT_ID;
    if (env.SERVICENOW_CLIENT_SECRET !== undefined) auth.client_secret = env.SERVICENOW_CLIENT_SECRET;
    if (env.SERVICENOW_TOKEN !== undefined) auth.token = env.SERVICENOW_TOKEN;
    if (env.SERVICENOW_TOKEN_URL !== undefined) auth.token_url = env.SERVICENOW_TOKEN_URL;

    if (Object.keys(auth).length > 0) {
      config.auth = auth;
    }
  }

  // Module configuration
  const modules: Record<string, any> = {};
  const moduleNames = ['generic', 'knowledge', 'incident', 'change', 'problem', 'cmdb', 'catalog', 'user'] as const;

  for (const moduleName of moduleNames) {
    const envPrefix = `MODULE_${moduleName.toUpperCase()}_`;
    const enabledEnv = env[`${envPrefix}ENABLED`];
    const allowWriteEnv = env[`${envPrefix}ALLOW_WRITE`];

    if (enabledEnv !== undefined || allowWriteEnv !== undefined) {
      const defaultModule = defaults.modules[moduleName as keyof typeof defaults.modules];
      modules[moduleName] = {
        enabled: parseBoolean(enabledEnv, defaultModule.enabled),
      };

      // User module doesn't have allow_write
      if (moduleName !== 'user' && 'allow_write' in defaultModule) {
        modules[moduleName].allow_write = parseBoolean(allowWriteEnv, defaultModule.allow_write);
      }
    }
  }

  if (Object.keys(modules).length > 0) {
    config.modules = modules;
  }

  // Rate limit configuration
  const rateLimit: Record<string, any> = {};
  if (env.RATE_LIMIT_MAX_PER_HOUR !== undefined) {
    rateLimit.max_per_hour = parseNumber(env.RATE_LIMIT_MAX_PER_HOUR, defaults.rate_limit.max_per_hour);
  }
  if (env.RATE_LIMIT_BURST_SIZE !== undefined) {
    rateLimit.burst_size = parseNumber(env.RATE_LIMIT_BURST_SIZE, defaults.rate_limit.burst_size);
  }
  if (Object.keys(rateLimit).length > 0) {
    config.rate_limit = rateLimit;
  }

  // Circuit breaker configuration
  const circuitBreaker: Record<string, any> = {};
  if (env.CIRCUIT_BREAKER_ENABLED !== undefined) {
    circuitBreaker.enabled = parseBoolean(env.CIRCUIT_BREAKER_ENABLED, defaults.circuit_breaker.enabled);
  }
  if (env.CIRCUIT_BREAKER_FAILURE_THRESHOLD !== undefined) {
    circuitBreaker.failure_threshold = parseNumber(env.CIRCUIT_BREAKER_FAILURE_THRESHOLD, defaults.circuit_breaker.failure_threshold);
  }
  if (env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS !== undefined) {
    circuitBreaker.reset_timeout_ms = parseNumber(env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS, defaults.circuit_breaker.reset_timeout_ms);
  }
  if (Object.keys(circuitBreaker).length > 0) {
    config.circuit_breaker = circuitBreaker;
  }

  // Logging configuration
  if (env.LOG_LEVEL) {
    config.logging = {
      level: env.LOG_LEVEL,
    };
  }

  return config;
}

/**
 * Deep merge two configuration objects
 * Later object takes precedence over earlier object
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined && source[key] !== null) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Load configuration with 3-tier precedence and validation
 *
 * @param configPath - Optional path to local config file (overrides CONFIG_FILE_PATH env var)
 * @returns Validated, frozen configuration object
 * @throws Error if configuration is invalid or missing required fields
 */
export function loadConfig(configPath?: string): AppConfig {
  // Layer 1: Start with defaults
  let merged: any = { ...defaults };

  // Layer 2: Merge with local config file (if exists)
  try {
    const localConfig = loadLocalConfig(configPath);
    merged = deepMerge(merged, localConfig);
  } catch (error) {
    // Re-throw file loading errors
    throw error;
  }

  // Layer 3: Override with environment variables (highest priority)
  const envConfig = loadEnvConfig();
  merged = deepMerge(merged, envConfig);

  // Validate with Zod schema
  const result = configSchema.safeParse(merged);

  if (!result.success) {
    // Format validation errors for user-friendly output
    const issues = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    throw new Error(
      `Invalid configuration. Please check your environment variables and config file:\n${issues}\n\n` +
      `Required environment variables:\n` +
      `  - SERVICENOW_INSTANCE: Your ServiceNow instance name\n` +
      `  - SERVICENOW_AUTH_TYPE: Authentication type (basic|oauth|token)\n` +
      `  - Credentials based on auth type (see .env.example for details)`
    );
  }

  // Freeze the configuration to prevent runtime mutations
  return Object.freeze(result.data) as AppConfig;
}

/**
 * Export configuration schema and types for external use
 */
export { configSchema, type AppConfig } from './schema.js';
export { defaults } from './defaults.js';
