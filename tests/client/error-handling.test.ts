/**
 * Unit tests for ServiceNowClient error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceNowClient, ServiceNowHttpError } from '../../src/client/index.js';
import { AuthStrategy } from '../../src/auth/types.js';

describe('ServiceNowClient - Error Handling', () => {
  let mockAuthStrategy: AuthStrategy;
  let client: ServiceNowClient;

  beforeEach(() => {
    mockAuthStrategy = {
      getAuthHeaders: vi.fn().mockResolvedValue({
        Authorization: 'Bearer mock-token',
      }),
    };

    client = new ServiceNowClient('dev12345', mockAuthStrategy, {
      timeout: 30000,
    });
  });

  describe('ServiceNowHttpError', () => {
    it('should throw ServiceNowHttpError on 4xx status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Record not found',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });

    it('should throw ServiceNowHttpError on 5xx status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error occurred',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });

    it('should include status code in error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Access denied',
      });

      try {
        await client.get('incident');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceNowHttpError);
        expect((error as ServiceNowHttpError).statusCode).toBe(403);
      }
    });

    it('should include status text in error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      });

      try {
        await client.get('incident');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceNowHttpError);
        expect((error as ServiceNowHttpError).statusText).toBe('Unauthorized');
      }
    });

    it('should include response body in error', async () => {
      const errorBody = JSON.stringify({
        error: { message: 'Invalid query parameter' },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => errorBody,
      });

      try {
        await client.get('incident');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceNowHttpError);
        expect((error as ServiceNowHttpError).body).toBe(errorBody);
      }
    });

    it('should have correct error message format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Record does not exist',
      });

      try {
        await client.get('incident');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceNowHttpError);
        expect((error as Error).message).toMatch(/ServiceNow API error: 404 Not Found/);
      }
    });
  });

  describe('HTTP Error Status Codes', () => {
    it('should handle 400 Bad Request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request parameters',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });

    it('should handle 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication required',
      });

      await expect(client.post('incident', {})).rejects.toThrow(
        ServiceNowHttpError,
      );
    });

    it('should handle 403 Forbidden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Insufficient permissions',
      });

      await expect(
        client.patch('incident', 'sys-id-123', {}),
      ).rejects.toThrow(ServiceNowHttpError);
    });

    it('should handle 404 Not Found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Record not found',
      });

      await expect(client.getById('incident', 'invalid-id')).rejects.toThrow(
        ServiceNowHttpError,
      );
    });

    it('should handle 429 Too Many Requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });

    it('should handle 500 Internal Server Error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Unexpected server error',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });

    it('should handle 503 Service Unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service temporarily unavailable',
      });

      await expect(client.get('incident')).rejects.toThrow(ServiceNowHttpError);
    });
  });

  describe('Network Errors', () => {
    it('should propagate network errors', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('Network connection failed'));

      await expect(client.get('incident')).rejects.toThrow(
        'Network connection failed',
      );
    });

    it('should propagate timeout errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Request timeout'));

      await expect(client.get('incident')).rejects.toThrow('Request timeout');
    });
  });

  describe('Response Parsing Errors', () => {
    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      await expect(client.get('incident')).rejects.toThrow(SyntaxError);
    });
  });

  describe('Error Handling Across Methods', () => {
    it('should handle errors in POST', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Missing required field',
      });

      await expect(client.post('incident', {})).rejects.toThrow(
        ServiceNowHttpError,
      );
    });

    it('should handle errors in PATCH', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Record not found',
      });

      await expect(
        client.patch('incident', 'invalid-id', {}),
      ).rejects.toThrow(ServiceNowHttpError);
    });

    it('should handle errors in DELETE', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Cannot delete record',
      });

      await expect(client.delete('incident', 'sys-id-123')).rejects.toThrow(
        ServiceNowHttpError,
      );
    });

    it('should handle errors in aggregate', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid aggregate query',
      });

      await expect(client.aggregate('incident')).rejects.toThrow(
        ServiceNowHttpError,
      );
    });
  });
});
