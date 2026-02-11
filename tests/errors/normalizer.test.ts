/**
 * Unit tests for error normalizer
 */

import { describe, it, expect } from 'vitest';
import { normalizeError, ServiceNowErrorCode } from '../../src/errors/index.js';
import { ServiceNowHttpError } from '../../src/client/types.js';
import { CircuitOpenError } from '../../src/resilience/circuit-breaker.js';

describe('normalizeError', () => {
  describe('HTTP Status Code Mapping', () => {
    it('should map 400 to VALIDATION_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(400, 'Bad Request', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('[VALIDATION_ERROR]');
      expect(result.content[0].text).toContain('Invalid request');
    });

    it('should map 401 to AUTHENTICATION_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(401, 'Unauthorized', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[AUTHENTICATION_ERROR]');
      expect(result.content[0].text).toContain('Authentication failed');
    });

    it('should map 403 to AUTHORIZATION_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(403, 'Forbidden', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[AUTHORIZATION_ERROR]');
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should map 404 to NOT_FOUND', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[NOT_FOUND]');
      expect(result.content[0].text).toContain('Record or table not found');
    });

    it('should map 429 to RATE_LIMITED', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[RATE_LIMITED]');
      expect(result.content[0].text).toContain('rate limit exceeded');
    });

    it('should map 500 to SERVER_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
      expect(result.content[0].text).toContain('server error');
    });

    it('should map 502 to SERVER_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(502, 'Bad Gateway', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
    });

    it('should map 503 to SERVER_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(503, 'Service Unavailable', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
    });

    it('should map unmapped 4xx to VALIDATION_ERROR', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(418, "I'm a teapot", '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[VALIDATION_ERROR]');
      expect(result.content[0].text).toContain('418');
    });
  });

  describe('Network Errors', () => {
    it('should map TypeError to NETWORK_ERROR', () => {
      const error = new TypeError('Failed to fetch');
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[NETWORK_ERROR]');
      expect(result.content[0].text).toContain('Unable to connect');
    });

    it('should map AbortError to NETWORK_ERROR', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[NETWORK_ERROR]');
      expect(result.content[0].text).toContain('timed out');
    });
  });

  describe('Circuit Breaker Errors', () => {
    it('should map CircuitOpenError to CIRCUIT_OPEN', () => {
      const error = new CircuitOpenError(15000); // 15 seconds remaining
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[CIRCUIT_OPEN]');
      expect(result.content[0].text).toContain('Circuit breaker is open');
      expect(result.content[0].text).toContain('15 seconds');
    });

    it('should include remaining time in circuit open message', () => {
      const error = new CircuitOpenError(45000); // 45 seconds
      const result = normalizeError(error);

      expect(result.content[0].text).toContain('45 seconds');
    });
  });

  describe('Unknown Errors', () => {
    it('should handle generic Error with fallback', () => {
      const error = new Error('Something went wrong');
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
      expect(result.content[0].text).toContain('unexpected error');
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Custom error object' };
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
    });

    it('should handle string errors', () => {
      const error = 'Something failed';
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
    });
  });

  describe('Error Body Sanitization', () => {
    it('should extract ServiceNow error message from JSON body', () => {
      const mockHeaders = new Headers();
      const errorBody = JSON.stringify({
        error: {
          message: 'Field "priority" is mandatory',
          detail: 'Missing required field',
        },
      });
      const error = new ServiceNowHttpError(400, 'Bad Request', errorBody, mockHeaders);
      const result = normalizeError(error);

      expect(result.content[0].text).toContain('Field "priority" is mandatory');
    });

    it('should extract error.detail if message not present', () => {
      const mockHeaders = new Headers();
      const errorBody = JSON.stringify({
        error: {
          detail: 'Invalid query syntax',
        },
      });
      const error = new ServiceNowHttpError(400, 'Bad Request', errorBody, mockHeaders);
      const result = normalizeError(error);

      expect(result.content[0].text).toContain('Invalid query syntax');
    });

    it('should strip stack traces from error body', () => {
      const mockHeaders = new Headers();
      const errorBody = 'Error at module.js:123:45\n    at processRequest';
      const error = new ServiceNowHttpError(500, 'Internal Server Error', errorBody, mockHeaders);
      const result = normalizeError(error);

      // Should not contain stack trace
      expect(result.content[0].text).not.toContain('at module.js');
      expect(result.content[0].text).not.toContain('processRequest');
    });

    it('should strip internal paths from error body', () => {
      const mockHeaders = new Headers();
      const errorBody = 'Error in /opt/servicenow/app.js';
      const error = new ServiceNowHttpError(500, 'Internal Server Error', errorBody, mockHeaders);
      const result = normalizeError(error);

      // Should not contain internal path
      expect(result.content[0].text).not.toContain('/opt/');
    });

    it('should strip potential credentials from error body', () => {
      const mockHeaders = new Headers();
      const errorBody = 'Authentication failed: password incorrect';
      const error = new ServiceNowHttpError(401, 'Unauthorized', errorBody, mockHeaders);
      const result = normalizeError(error);

      // Should not contain 'password'
      expect(result.content[0].text).not.toContain('password incorrect');
    });

    it('should truncate very long error bodies', () => {
      const mockHeaders = new Headers();
      const longBody = 'Error: ' + 'x'.repeat(1000);
      const error = new ServiceNowHttpError(500, 'Internal Server Error', longBody, mockHeaders);
      const result = normalizeError(error);

      const errorText = result.content[0].text;
      // Should be truncated (error details should be < 500 chars)
      expect(errorText.length).toBeLessThan(700);
    });

    it('should handle empty error body', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('[NOT_FOUND]');
      // Should not crash, should not have "Details:" section
      expect(result.content[0].text).not.toContain('Details:');
    });

    it('should handle malformed JSON in error body', () => {
      const mockHeaders = new Headers();
      const errorBody = '{ invalid json';
      const error = new ServiceNowHttpError(500, 'Internal Server Error', errorBody, mockHeaders);
      const result = normalizeError(error);

      expect(result.isError).toBe(true);
      // Should still return an error result without crashing
      expect(result.content[0].text).toContain('[SERVER_ERROR]');
    });
  });

  describe('Error Response Structure', () => {
    it('should return CallToolResult with isError: true', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const result = normalizeError(error);

      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should return text content type', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const result = normalizeError(error);

      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should format error with code, message, and details', () => {
      const mockHeaders = new Headers();
      const errorBody = JSON.stringify({
        error: { message: 'Specific error details' },
      });
      const error = new ServiceNowHttpError(400, 'Bad Request', errorBody, mockHeaders);
      const result = normalizeError(error);

      const text = result.content[0].text;
      expect(text).toMatch(/\[VALIDATION_ERROR\]/);
      expect(text).toContain('Invalid request');
      expect(text).toContain('Details:');
      expect(text).toContain('Specific error details');
    });

    it('should format error without details when body is empty', () => {
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(401, 'Unauthorized', '', mockHeaders);
      const result = normalizeError(error);

      const text = result.content[0].text;
      expect(text).toMatch(/\[AUTHENTICATION_ERROR\] Authentication failed/);
      expect(text).not.toContain('Details:');
    });
  });
});
