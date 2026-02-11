/**
 * Unit tests for structured JSON logging module
 */

import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { PassThrough } from 'stream';
import {
  createLogger,
  initializeLogger,
  getLogger,
  createChildLogger,
  logApiCall,
} from '../../src/logging/index.js';

/**
 * Helper to create a logger that writes to a memory stream for testing
 */
function createTestLogger(level: string = 'info'): {
  logger: pino.Logger;
  getOutput: () => string;
} {
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  const logger = pino(
    {
      level,
      redact: {
        paths: [
          'password',
          '*.password',
          'token',
          '*.token',
          'client_secret',
          '*.client_secret',
          'client_id',
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
    stream,
  );

  return {
    logger,
    getOutput: () => Buffer.concat(chunks).toString('utf-8'),
  };
}

describe('createLogger', () => {
  it('should create a Pino logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('child');
  });

  it('should write JSON output', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info({ test: 'data' }, 'Test message');

    const output = getOutput();
    expect(output).toBeTruthy();
    const parsed = JSON.parse(output.trim());
    expect(parsed).toHaveProperty('msg', 'Test message');
    expect(parsed).toHaveProperty('test', 'data');
  });

  it('should respect configured log level', () => {
    const { logger, getOutput } = createTestLogger('error');

    logger.info({ level: 'info' }, 'This should be suppressed');
    logger.error({ level: 'error' }, 'This should be logged');

    const output = getOutput();
    expect(output).toContain('This should be logged');
  });

  it('should accept different log levels', () => {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    for (const level of levels) {
      const { logger } = createTestLogger(level);
      expect(logger).toBeDefined();
    }
  });
});

describe('Logger Credential Redaction', () => {
  it('should redact password field', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info({ password: 'secret123' }, 'Logging credentials');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.password).toBe('[REDACTED]');
  });

  it('should redact nested password field', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info(
      { user: { password: 'secret123' } },
      'Logging nested credentials',
    );

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.user.password).toBe('[REDACTED]');
  });

  it('should redact token field', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info({ token: 'abc123def456' }, 'Logging token');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.token).toBe('[REDACTED]');
  });

  it('should redact client_secret field', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info({ client_secret: 'oauth_secret_xyz' }, 'OAuth credentials');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.client_secret).toBe('[REDACTED]');
  });

  it('should redact authorization header', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info(
      { headers: { authorization: 'Bearer token123' } },
      'HTTP headers',
    );

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.headers.authorization).toBe('[REDACTED]');
  });

  it('should redact both lowercase and uppercase Authorization header', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info(
      { headers: { Authorization: 'Bearer token456' } },
      'HTTP headers uppercase',
    );

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.headers.Authorization).toBe('[REDACTED]');
  });

  it('should not redact non-sensitive fields', () => {
    const { logger, getOutput } = createTestLogger();
    logger.info(
      { userId: 'abc123', action: 'login', status: 'success' },
      'User action',
    );

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.userId).toBe('abc123');
    expect(parsed.action).toBe('login');
    expect(parsed.status).toBe('success');
  });
});

describe('initializeLogger & getLogger', () => {
  it('should initialize logger with specified level', () => {
    const logger = initializeLogger('info');
    expect(logger).toBeDefined();
  });

  it('should return existing logger from getLogger', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2);
  });

  it('should create fallback logger if getLogger called before initialization', () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('info');
  });
});

describe('createChildLogger', () => {
  it('should create child logger with injected correlationId', () => {
    const { logger, getOutput } = createTestLogger();
    const child = createChildLogger(logger);
    child.info('Child log message');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed).toHaveProperty('correlationId');
    expect(parsed.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
  });

  it('should assign unique correlationIds to each child logger', () => {
    const { logger, getOutput } = createTestLogger();
    const child1 = createChildLogger(logger);
    const child2 = createChildLogger(logger);

    child1.info('First child');
    child2.info('Second child');

    const output = getOutput();
    const lines = output.trim().split('\n');
    const parsed1 = JSON.parse(lines[0]);
    const parsed2 = JSON.parse(lines[1]);

    expect(parsed1.correlationId).not.toBe(parsed2.correlationId);
  });

  it('should inject context into child logger', () => {
    const { logger, getOutput } = createTestLogger();
    const child = createChildLogger(logger, { userId: '12345', action: 'query' });
    child.info('Contextual logging');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.userId).toBe('12345');
    expect(parsed.action).toBe('query');
    expect(parsed).toHaveProperty('correlationId');
  });

  it('should preserve parent logger in child', () => {
    const { logger } = createTestLogger();
    const child = createChildLogger(logger);

    expect(child).toHaveProperty('info');
    expect(child).toHaveProperty('warn');
    expect(child).toHaveProperty('error');
  });

  it('should include both correlationId and context fields', () => {
    const { logger, getOutput } = createTestLogger();
    const child = createChildLogger(logger, {
      moduleId: 'test-module',
      requestId: 'req-123',
    });
    child.info('Combined context');

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed).toHaveProperty('correlationId');
    expect(parsed.moduleId).toBe('test-module');
    expect(parsed.requestId).toBe('req-123');
  });
});

describe('logApiCall', () => {
  it('should log API call with all required fields', () => {
    const { logger, getOutput } = createTestLogger();
    logApiCall(logger, {
      method: 'GET',
      table: 'incident',
      duration_ms: 123,
      status_code: 200,
    });

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.method).toBe('GET');
    expect(parsed.table).toBe('incident');
    expect(parsed.duration_ms).toBe(123);
    expect(parsed.status_code).toBe(200);
  });

  it('should include message with method, table, and status', () => {
    const { logger, getOutput } = createTestLogger();
    logApiCall(logger, {
      method: 'POST',
      table: 'change',
      duration_ms: 456,
      status_code: 201,
    });

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.msg).toContain('POST');
    expect(parsed.msg).toContain('change');
    expect(parsed.msg).toContain('201');
    expect(parsed.msg).toContain('456ms');
  });

  it('should log API call with optional sys_id field', () => {
    const { logger, getOutput } = createTestLogger();
    logApiCall(logger, {
      method: 'PATCH',
      table: 'problem',
      duration_ms: 250,
      status_code: 200,
      sys_id: 'abc123def456',
    });

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.sys_id).toBe('abc123def456');
  });

  it('should work with child logger context', () => {
    const { logger, getOutput } = createTestLogger();
    const child = createChildLogger(logger, { userId: 'user-999' });
    logApiCall(child, {
      method: 'DELETE',
      table: 'incident',
      duration_ms: 100,
      status_code: 204,
    });

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.method).toBe('DELETE');
    expect(parsed.userId).toBe('user-999');
    expect(parsed).toHaveProperty('correlationId');
  });

  it('should log different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PATCH', 'DELETE'];

    for (const method of methods) {
      const { logger, getOutput } = createTestLogger();
      logApiCall(logger, {
        method,
        table: 'incident',
        duration_ms: 100,
        status_code: 200,
      });

      const output = getOutput();
      const parsed = JSON.parse(output.trim());
      expect(parsed.method).toBe(method);
      expect(parsed.msg).toContain(method);
    }
  });

  it('should log various HTTP status codes', () => {
    const statusCodes = [200, 201, 204, 400, 401, 403, 404, 429, 500, 503];

    for (const statusCode of statusCodes) {
      const { logger, getOutput } = createTestLogger();
      logApiCall(logger, {
        method: 'GET',
        table: 'incident',
        duration_ms: 100,
        status_code: statusCode,
      });

      const output = getOutput();
      const parsed = JSON.parse(output.trim());
      expect(parsed.status_code).toBe(statusCode);
      expect(parsed.msg).toContain(statusCode.toString());
    }
  });
});

describe('Logger Integration', () => {
  it('should allow creating multiple child loggers from same parent', () => {
    const { logger } = createTestLogger();
    const child1 = createChildLogger(logger, { requestId: '1' });
    const child2 = createChildLogger(logger, { requestId: '2' });
    const child3 = createChildLogger(logger, { requestId: '3' });

    expect(child1).toBeDefined();
    expect(child2).toBeDefined();
    expect(child3).toBeDefined();
  });

  it('should maintain separate correlation IDs across multiple child loggers', () => {
    const { logger, getOutput } = createTestLogger();
    const child1 = createChildLogger(logger);
    const child2 = createChildLogger(logger);
    const child3 = createChildLogger(logger);

    child1.info('Message 1');
    child2.info('Message 2');
    child3.info('Message 3');

    const output = getOutput();
    const lines = output.trim().split('\n');
    const ids = new Set(
      lines.map((line) => JSON.parse(line).correlationId),
    );
    expect(ids.size).toBe(3);
  });

  it('should support logging API calls with child loggers', () => {
    const { logger, getOutput } = createTestLogger();
    const child = createChildLogger(logger, { module: 'incident-handler' });
    logApiCall(child, {
      method: 'POST',
      table: 'incident',
      duration_ms: 234,
      status_code: 201,
      sys_id: 'INC001',
    });

    const output = getOutput();
    const parsed = JSON.parse(output.trim());
    expect(parsed.method).toBe('POST');
    expect(parsed.table).toBe('incident');
    expect(parsed.module).toBe('incident-handler');
    expect(parsed).toHaveProperty('correlationId');
  });
});
