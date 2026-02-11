/**
 * Configuration validation schemas using Zod.
 * Enforces type safety and runtime validation for all configuration.
 */

import { z } from 'zod';

/**
 * ServiceNow instance configuration schema
 */
const serviceNowSchema = z.object({
  instance: z.string().min(1, 'ServiceNow instance name is required'),
  timeout: z.number().positive().default(30000),
  max_retries: z.number().int().min(0).max(10).default(3),
});

/**
 * Authentication configuration schemas (discriminated by type)
 */
const basicAuthSchema = z.object({
  type: z.literal('basic'),
  username: z.string().min(1, 'Username is required for basic auth'),
  password: z.string().min(1, 'Password is required for basic auth'),
});

const oauthAuthSchema = z.object({
  type: z.literal('oauth'),
  client_id: z.string().min(1, 'Client ID is required for OAuth'),
  client_secret: z.string().min(1, 'Client secret is required for OAuth'),
  token_url: z.string().url().optional(),
});

const tokenAuthSchema = z.object({
  type: z.literal('token'),
  token: z.string().min(1, 'Token is required for token auth'),
});

const authSchema = z.discriminatedUnion('type', [
  basicAuthSchema,
  oauthAuthSchema,
  tokenAuthSchema,
]);

/**
 * Module configuration schema (per-module enable/write flags)
 */
const moduleConfigSchema = z.object({
  enabled: z.boolean(),
  allow_write: z.boolean(),
});

const userModuleConfigSchema = z.object({
  enabled: z.boolean(),
  // User module is read-only, no allow_write flag
});

const modulesSchema = z.object({
  generic: moduleConfigSchema,
  knowledge: moduleConfigSchema,
  incident: moduleConfigSchema,
  change: moduleConfigSchema,
  problem: moduleConfigSchema,
  cmdb: moduleConfigSchema,
  catalog: moduleConfigSchema,
  user: userModuleConfigSchema,
});

/**
 * Rate limiting configuration schema
 */
const rateLimitSchema = z.object({
  max_per_hour: z.number().int().positive().default(1000),
  burst_size: z.number().int().positive().default(20),
});

/**
 * Circuit breaker configuration schema
 */
const circuitBreakerSchema = z.object({
  enabled: z.boolean().default(false),
  failure_threshold: z.number().int().positive().default(5),
  reset_timeout_ms: z.number().int().positive().default(30000),
});

/**
 * Logging configuration schema
 */
const loggingSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

/**
 * Complete application configuration schema
 */
export const configSchema = z.object({
  servicenow: serviceNowSchema,
  auth: authSchema,
  modules: modulesSchema,
  rate_limit: rateLimitSchema,
  circuit_breaker: circuitBreakerSchema,
  logging: loggingSchema,
});

/**
 * TypeScript type inferred from the schema
 */
export type AppConfig = z.infer<typeof configSchema>;

/**
 * Individual schema exports for testing and modular validation
 */
export {
  serviceNowSchema,
  authSchema,
  basicAuthSchema,
  oauthAuthSchema,
  tokenAuthSchema,
  modulesSchema,
  rateLimitSchema,
  circuitBreakerSchema,
  loggingSchema,
};
