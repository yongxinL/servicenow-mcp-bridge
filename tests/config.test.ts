/**
 * Unit tests for configuration system
 * Tests 3-tier precedence, validation, and fail-fast behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config/index.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Store original environment
const originalEnv = { ...process.env };

// Test config file path
const TEST_CONFIG_DIR = join(process.cwd(), 'tests', 'fixtures');
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, 'test-config.json');

/**
 * Helper to set up environment variables for testing
 */
function setTestEnv(env: Record<string, string>): void {
  Object.assign(process.env, env);
}

/**
 * Helper to clear all config-related environment variables
 */
function clearConfigEnv(): void {
  const configKeys = Object.keys(process.env).filter(
    (key) =>
      key.startsWith('SERVICENOW_') ||
      key.startsWith('MODULE_') ||
      key.startsWith('RATE_LIMIT_') ||
      key.startsWith('CIRCUIT_BREAKER_') ||
      key === 'LOG_LEVEL' ||
      key === 'CONFIG_FILE_PATH'
  );
  configKeys.forEach((key) => delete process.env[key]);
}

/**
 * Helper to create a temporary config file
 */
function createTestConfigFile(config: Record<string, any>): void {
  if (!existsSync(TEST_CONFIG_DIR)) {
    mkdirSync(TEST_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Helper to clean up test config file
 */
function cleanupTestConfigFile(): void {
  if (existsSync(TEST_CONFIG_PATH)) {
    unlinkSync(TEST_CONFIG_PATH);
  }
}

beforeEach(() => {
  clearConfigEnv();
});

afterEach(() => {
  // Restore original environment
  process.env = { ...originalEnv };
  cleanupTestConfigFile();
});

describe('Configuration System', () => {
  describe('Basic Loading', () => {
    it('should fail when required configuration is missing', () => {
      expect(() => loadConfig()).toThrow('Invalid configuration');
    });

    it('should load valid configuration from environment variables', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'basic',
        SERVICENOW_USERNAME: 'admin',
        SERVICENOW_PASSWORD: 'password123',
      });

      const config = loadConfig();

      expect(config.servicenow.instance).toBe('dev12345');
      expect(config.auth.type).toBe('basic');
      if (config.auth.type === 'basic') {
        expect(config.auth.username).toBe('admin');
        expect(config.auth.password).toBe('password123');
      }
    });

    it('should use defaults for optional configuration', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      const config = loadConfig();

      expect(config.servicenow.timeout).toBe(30000);
      expect(config.servicenow.max_retries).toBe(3);
      expect(config.rate_limit.max_per_hour).toBe(1000);
      expect(config.rate_limit.burst_size).toBe(20);
      expect(config.circuit_breaker.enabled).toBe(false);
      expect(config.logging.level).toBe('info');
    });
  });

  describe('Authentication Type Discrimination', () => {
    it('should validate basic auth credentials', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'basic',
        SERVICENOW_USERNAME: 'admin',
        // Missing password
      });

      expect(() => loadConfig()).toThrow('Password is required for basic auth');
    });

    it('should validate OAuth credentials', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'oauth',
        SERVICENOW_CLIENT_ID: 'client123',
        // Missing client_secret
      });

      expect(() => loadConfig()).toThrow('Client secret is required for OAuth');
    });

    it('should validate token auth credentials', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        // Missing token
      });

      expect(() => loadConfig()).toThrow('Token is required for token auth');
    });

    it('should accept valid OAuth configuration with optional token_url', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'oauth',
        SERVICENOW_CLIENT_ID: 'client123',
        SERVICENOW_CLIENT_SECRET: 'secret456',
        SERVICENOW_TOKEN_URL: 'https://dev12345.service-now.com/oauth_token.do',
      });

      const config = loadConfig();

      expect(config.auth.type).toBe('oauth');
      if (config.auth.type === 'oauth') {
        expect(config.auth.client_id).toBe('client123');
        expect(config.auth.client_secret).toBe('secret456');
        expect(config.auth.token_url).toBe('https://dev12345.service-now.com/oauth_token.do');
      }
    });
  });

  describe('Module Configuration', () => {
    it('should have all modules enabled by default', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      const config = loadConfig();

      expect(config.modules.generic.enabled).toBe(true);
      expect(config.modules.knowledge.enabled).toBe(true);
      expect(config.modules.incident.enabled).toBe(true);
      expect(config.modules.change.enabled).toBe(true);
      expect(config.modules.problem.enabled).toBe(true);
      expect(config.modules.cmdb.enabled).toBe(true);
      expect(config.modules.catalog.enabled).toBe(true);
      expect(config.modules.user.enabled).toBe(true);
    });

    it('should have all write permissions disabled by default', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      const config = loadConfig();

      expect(config.modules.generic.allow_write).toBe(false);
      expect(config.modules.knowledge.allow_write).toBe(false);
      expect(config.modules.incident.allow_write).toBe(false);
      expect(config.modules.change.allow_write).toBe(false);
      expect(config.modules.problem.allow_write).toBe(false);
      expect(config.modules.cmdb.allow_write).toBe(false);
      expect(config.modules.catalog.allow_write).toBe(false);
      // User module doesn't have allow_write
    });

    it('should allow enabling write permissions via environment variables', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        MODULE_INCIDENT_ALLOW_WRITE: 'true',
        MODULE_CHANGE_ALLOW_WRITE: '1',
      });

      const config = loadConfig();

      expect(config.modules.incident.allow_write).toBe(true);
      expect(config.modules.change.allow_write).toBe(true);
      expect(config.modules.problem.allow_write).toBe(false);
    });

    it('should allow disabling modules via environment variables', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        MODULE_CATALOG_ENABLED: 'false',
        MODULE_CMDB_ENABLED: '0',
      });

      const config = loadConfig();

      expect(config.modules.catalog.enabled).toBe(false);
      expect(config.modules.cmdb.enabled).toBe(false);
      expect(config.modules.incident.enabled).toBe(true);
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should override defaults with environment variables', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        SERVICENOW_TIMEOUT: '60000',
        SERVICENOW_MAX_RETRIES: '5',
        RATE_LIMIT_MAX_PER_HOUR: '5000',
        LOG_LEVEL: 'debug',
      });

      const config = loadConfig();

      expect(config.servicenow.timeout).toBe(60000);
      expect(config.servicenow.max_retries).toBe(5);
      expect(config.rate_limit.max_per_hour).toBe(5000);
      expect(config.logging.level).toBe('debug');
    });

    it('should parse boolean environment variables correctly', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        CIRCUIT_BREAKER_ENABLED: 'true',
        MODULE_INCIDENT_ENABLED: 'yes',
        MODULE_CHANGE_ENABLED: '1',
      });

      const config = loadConfig();

      expect(config.circuit_breaker.enabled).toBe(true);
      expect(config.modules.incident.enabled).toBe(true);
      expect(config.modules.change.enabled).toBe(true);
    });
  });

  describe('Config File Loading', () => {
    it('should merge config file with defaults', () => {
      createTestConfigFile({
        servicenow: {
          instance: 'fileinstance',
          timeout: 45000,
        },
        auth: {
          type: 'basic',
          username: 'fileuser',
          password: 'filepass',
        },
      });

      const config = loadConfig(TEST_CONFIG_PATH);

      expect(config.servicenow.instance).toBe('fileinstance');
      expect(config.servicenow.timeout).toBe(45000);
      expect(config.servicenow.max_retries).toBe(3); // Default value
    });

    it('should allow environment variables to override config file', () => {
      createTestConfigFile({
        servicenow: {
          instance: 'fileinstance',
          timeout: 45000,
        },
        auth: {
          type: 'basic',
          username: 'fileuser',
          password: 'filepass',
        },
      });

      setTestEnv({
        SERVICENOW_INSTANCE: 'envinstance',
        SERVICENOW_USERNAME: 'envuser',
      });

      const config = loadConfig(TEST_CONFIG_PATH);

      // Env vars take precedence
      expect(config.servicenow.instance).toBe('envinstance');
      if (config.auth.type === 'basic') {
        expect(config.auth.username).toBe('envuser');
        // Password from file still applies
        expect(config.auth.password).toBe('filepass');
      }
      // Config file value used when no env override
      expect(config.servicenow.timeout).toBe(45000);
    });

    it('should handle missing config file gracefully', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      const config = loadConfig('/nonexistent/config.json');

      expect(config.servicenow.instance).toBe('dev12345');
    });

    it('should throw error for invalid JSON in config file', () => {
      if (!existsSync(TEST_CONFIG_DIR)) {
        mkdirSync(TEST_CONFIG_DIR, { recursive: true });
      }
      writeFileSync(TEST_CONFIG_PATH, '{ invalid json }');

      expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Failed to load config file');

      cleanupTestConfigFile();
    });
  });

  describe('Fail-Fast Validation', () => {
    it('should provide descriptive error for missing instance', () => {
      setTestEnv({
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      expect(() => loadConfig()).toThrow(/servicenow\.instance/);
    });

    it('should provide descriptive error for invalid log level', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        LOG_LEVEL: 'invalid',
      });

      expect(() => loadConfig()).toThrow(/logging\.level/);
    });

    it('should validate number ranges', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
        SERVICENOW_MAX_RETRIES: '-1',
      });

      expect(() => loadConfig()).toThrow();
    });
  });

  describe('Configuration Immutability', () => {
    it('should return a frozen configuration object', () => {
      setTestEnv({
        SERVICENOW_INSTANCE: 'dev12345',
        SERVICENOW_AUTH_TYPE: 'token',
        SERVICENOW_TOKEN: 'abc123',
      });

      const config = loadConfig();

      expect(Object.isFrozen(config)).toBe(true);
    });
  });
});
